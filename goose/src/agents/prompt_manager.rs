use chrono::Utc;
use serde_json::Value;
use std::collections::HashMap;

use crate::agents::extension::ExtensionInfo;
use crate::agents::router_tools::llm_search_tool_prompt;
use crate::providers::base::get_current_model;
use crate::{config::Config, prompt_template, utils::sanitize_unicode_tags};

pub struct PromptManager {
    system_prompt_override: Option<String>,
    system_prompt_extras: Vec<String>,
    current_date_timestamp: String,
}

impl Default for PromptManager {
    fn default() -> Self {
        PromptManager::new()
    }
}

impl PromptManager {
    pub fn new() -> Self {
        PromptManager {
            system_prompt_override: None,
            system_prompt_extras: Vec::new(),
            // Use the fixed current date time so that prompt cache can be used.
            current_date_timestamp: Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        }
    }

    /// Add an additional instruction to the system prompt
    pub fn add_system_prompt_extra(&mut self, instruction: String) {
        self.system_prompt_extras.push(instruction);
    }

    /// Override the system prompt with custom text
    pub fn set_system_prompt_override(&mut self, template: String) {
        self.system_prompt_override = Some(template);
    }

    /// Normalize a model name (replace - and / with _, lower case)
    fn normalize_model_name(name: &str) -> String {
        name.replace(['-', '/', '.'], "_").to_lowercase()
    }

    /// Map model (normalized) to prompt filenames; returns filename if a key is contained in the normalized model
    fn model_prompt_map(model: &str) -> &'static str {
        let mut map = HashMap::new();
        map.insert("gpt_4_1", "system_gpt_4.1.md");
        // Add more mappings as needed
        let norm_model = Self::normalize_model_name(model);
        for (key, val) in &map {
            if norm_model.contains(key) {
                return val;
            }
        }
        "system.md"
    }

    /// Build the final system prompt
    ///
    /// * `extensions_info` – extension information for each extension/MCP
    /// * `frontend_instructions` – instructions for the "frontend" tool
    pub fn build_system_prompt(
        &self,
        extensions_info: Vec<ExtensionInfo>,
        frontend_instructions: Option<String>,
        suggest_disable_extensions_prompt: Value,
        model_name: Option<&str>,
        router_enabled: bool,
    ) -> String {
        let mut context: HashMap<&str, Value> = HashMap::new();
        let mut extensions_info = extensions_info.clone();

        // Add frontend instructions to extensions_info to simplify json rendering
        if let Some(frontend_instructions) = frontend_instructions {
            extensions_info.push(ExtensionInfo::new(
                "frontend",
                &frontend_instructions,
                false,
            ));
        }

        let sanitized_extensions_info: Vec<ExtensionInfo> = extensions_info
            .into_iter()
            .map(|mut ext_info| {
                ext_info.instructions = sanitize_unicode_tags(&ext_info.instructions);
                ext_info
            })
            .collect();

        context.insert(
            "extensions",
            serde_json::to_value(sanitized_extensions_info).unwrap(),
        );

        if router_enabled {
            context.insert(
                "tool_selection_strategy",
                Value::String(llm_search_tool_prompt()),
            );
        }

        context.insert(
            "current_date_time",
            Value::String(self.current_date_timestamp.clone()),
        );

        // Add the suggestion about disabling extensions if flag is true
        context.insert(
            "suggest_disable",
            Value::String(suggest_disable_extensions_prompt.to_string()),
        );

        // Add the mode to the context for conditional rendering
        let config = Config::global();
        let goose_mode = config.get_param("GOOSE_MODE").unwrap_or("auto".to_string());
        context.insert("goose_mode", Value::String(goose_mode.clone()));
        context.insert("is_autonomous", Value::Bool(goose_mode == "auto"));

        // First check the global store, and only if it's not available, fall back to the provided model_name
        let model_to_use: Option<String> =
            get_current_model().or_else(|| model_name.map(|s| s.to_string()));

        // Conditionally load the override prompt or the global system prompt
        let base_prompt = if let Some(override_prompt) = &self.system_prompt_override {
            let sanitized_override_prompt = sanitize_unicode_tags(override_prompt);
            prompt_template::render_inline_once(&sanitized_override_prompt, &context)
                .expect("Prompt should render")
        } else if let Some(model) = &model_to_use {
            // Use the fuzzy mapping to determine the prompt file, or fall back to legacy logic
            let prompt_file = Self::model_prompt_map(model);
            match prompt_template::render_global_file(prompt_file, &context) {
                Ok(prompt) => prompt,
                Err(_) => {
                    // Fall back to the standard system.md if model-specific one doesn't exist
                    prompt_template::render_global_file("system.md", &context)
                        .expect("Prompt should render")
                }
            }
        } else {
            prompt_template::render_global_file("system.md", &context)
                .expect("Prompt should render")
        };

        let mut system_prompt_extras = self.system_prompt_extras.clone();
        if goose_mode == "chat" {
            system_prompt_extras.push(
                "Right now you are in the chat only mode, no access to any tool use and system."
                    .to_string(),
            );
        } else {
            system_prompt_extras
                .push("Right now you are *NOT* in the chat only mode and have access to tool use and system.".to_string());
        }

        let sanitized_system_prompt_extras: Vec<String> = system_prompt_extras
            .into_iter()
            .map(|extra| sanitize_unicode_tags(&extra))
            .collect();

        if sanitized_system_prompt_extras.is_empty() {
            base_prompt
        } else {
            format!(
                "{}\n\n# Additional Instructions:\n\n{}",
                base_prompt,
                sanitized_system_prompt_extras.join("\n\n")
            )
        }
    }

    pub async fn get_recipe_prompt(&self) -> String {
        let context: HashMap<&str, Value> = HashMap::new();
        prompt_template::render_global_file("recipe.md", &context).expect("Prompt should render")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_model_name() {
        assert_eq!(PromptManager::normalize_model_name("gpt-4.1"), "gpt_4_1");
        assert_eq!(PromptManager::normalize_model_name("gpt/3.5"), "gpt_3_5");
        assert_eq!(
            PromptManager::normalize_model_name("GPT-3.5/PLUS"),
            "gpt_3_5_plus"
        );
    }

    #[test]
    fn test_model_prompt_map_matches() {
        // should match prompts based on contained normalized keys
        assert_eq!(
            PromptManager::model_prompt_map("gpt-4.1"),
            "system_gpt_4.1.md"
        );

        assert_eq!(
            PromptManager::model_prompt_map("gpt-4.1-2025-04-14"),
            "system_gpt_4.1.md"
        );

        assert_eq!(
            PromptManager::model_prompt_map("openai/gpt-4.1"),
            "system_gpt_4.1.md"
        );
        assert_eq!(
            PromptManager::model_prompt_map("goose-gpt-4-1"),
            "system_gpt_4.1.md"
        );
        assert_eq!(
            PromptManager::model_prompt_map("gpt-4-1-huge"),
            "system_gpt_4.1.md"
        );
    }

    #[test]
    fn test_model_prompt_map_none() {
        // should return system.md for unrecognized/unsupported model names
        assert_eq!(PromptManager::model_prompt_map("llama-3-70b"), "system.md");
        assert_eq!(PromptManager::model_prompt_map("goose"), "system.md");
        assert_eq!(
            PromptManager::model_prompt_map("claude-3.7-sonnet"),
            "system.md"
        );
        assert_eq!(
            PromptManager::model_prompt_map("xxx-unknown-model"),
            "system.md"
        );
    }

    #[test]
    fn test_build_system_prompt_sanitizes_override() {
        let mut manager = PromptManager::new();
        let malicious_override = "System prompt\u{E0041}\u{E0042}\u{E0043}with hidden text";
        manager.set_system_prompt_override(malicious_override.to_string());

        let result =
            manager.build_system_prompt(vec![], None, Value::String("".to_string()), None, false);

        assert!(!result.contains('\u{E0041}'));
        assert!(!result.contains('\u{E0042}'));
        assert!(!result.contains('\u{E0043}'));
        assert!(result.contains("System prompt"));
        assert!(result.contains("with hidden text"));
    }

    #[test]
    fn test_build_system_prompt_sanitizes_extras() {
        let mut manager = PromptManager::new();
        let malicious_extra = "Extra instruction\u{E0041}\u{E0042}\u{E0043}hidden";
        manager.add_system_prompt_extra(malicious_extra.to_string());

        let result =
            manager.build_system_prompt(vec![], None, Value::String("".to_string()), None, false);

        assert!(!result.contains('\u{E0041}'));
        assert!(!result.contains('\u{E0042}'));
        assert!(!result.contains('\u{E0043}'));
        assert!(result.contains("Extra instruction"));
        assert!(result.contains("hidden"));
    }

    #[test]
    fn test_build_system_prompt_sanitizes_multiple_extras() {
        let mut manager = PromptManager::new();
        manager.add_system_prompt_extra("First\u{E0041}instruction".to_string());
        manager.add_system_prompt_extra("Second\u{E0042}instruction".to_string());
        manager.add_system_prompt_extra("Third\u{E0043}instruction".to_string());

        let result =
            manager.build_system_prompt(vec![], None, Value::String("".to_string()), None, false);

        assert!(!result.contains('\u{E0041}'));
        assert!(!result.contains('\u{E0042}'));
        assert!(!result.contains('\u{E0043}'));
        assert!(result.contains("Firstinstruction"));
        assert!(result.contains("Secondinstruction"));
        assert!(result.contains("Thirdinstruction"));
    }

    #[test]
    fn test_build_system_prompt_preserves_legitimate_unicode_in_extras() {
        let mut manager = PromptManager::new();
        let legitimate_unicode = "Instruction with 世界 and 🌍 emojis";
        manager.add_system_prompt_extra(legitimate_unicode.to_string());

        let result =
            manager.build_system_prompt(vec![], None, Value::String("".to_string()), None, false);

        assert!(result.contains("世界"));
        assert!(result.contains("🌍"));
        assert!(result.contains("Instruction with"));
        assert!(result.contains("emojis"));
    }

    #[test]
    fn test_build_system_prompt_sanitizes_extension_instructions() {
        let manager = PromptManager::new();
        let malicious_extension_info = ExtensionInfo::new(
            "test_extension",
            "Extension help\u{E0041}\u{E0042}\u{E0043}hidden instructions",
            false,
        );

        let result = manager.build_system_prompt(
            vec![malicious_extension_info],
            None,
            Value::String("".to_string()),
            None,
            false,
        );

        assert!(!result.contains('\u{E0041}'));
        assert!(!result.contains('\u{E0042}'));
        assert!(!result.contains('\u{E0043}'));
        assert!(result.contains("Extension help"));
        assert!(result.contains("hidden instructions"));
    }
}
