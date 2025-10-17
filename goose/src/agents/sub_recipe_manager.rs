use rmcp::model::Tool;
use rmcp::model::{Content, ErrorCode, ErrorData};
use serde_json::Value;
use std::borrow::Cow;
use std::collections::HashMap;

use crate::{
    agents::{
        recipe_tools::sub_recipe_tools::{
            create_sub_recipe_task, create_sub_recipe_task_tool, SUB_RECIPE_TASK_TOOL_NAME_PREFIX,
        },
        subagent_execution_tool::tasks_manager::TasksManager,
        tool_execution::ToolCallResult,
    },
    recipe::SubRecipe,
};

#[derive(Debug, Clone)]
pub struct SubRecipeManager {
    pub sub_recipe_tools: HashMap<String, Tool>,
    pub sub_recipes: HashMap<String, SubRecipe>,
}

impl Default for SubRecipeManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SubRecipeManager {
    pub fn new() -> Self {
        Self {
            sub_recipe_tools: HashMap::new(),
            sub_recipes: HashMap::new(),
        }
    }

    pub fn add_sub_recipe_tools(&mut self, sub_recipes_to_add: Vec<SubRecipe>) {
        for sub_recipe in sub_recipes_to_add {
            let sub_recipe_key = format!(
                "{}_{}",
                SUB_RECIPE_TASK_TOOL_NAME_PREFIX,
                sub_recipe.name.clone()
            );
            let tool = create_sub_recipe_task_tool(&sub_recipe);
            self.sub_recipe_tools.insert(sub_recipe_key.clone(), tool);
            self.sub_recipes.insert(sub_recipe_key.clone(), sub_recipe);
        }
    }

    pub fn is_sub_recipe_tool(&self, tool_name: &str) -> bool {
        self.sub_recipe_tools.contains_key(tool_name)
    }

    pub async fn dispatch_sub_recipe_tool_call(
        &self,
        tool_name: &str,
        params: Value,
        tasks_manager: &TasksManager,
    ) -> ToolCallResult {
        let result = self
            .call_sub_recipe_tool(tool_name, params, tasks_manager)
            .await;
        match result {
            Ok(call_result) => ToolCallResult::from(Ok(call_result)),
            Err(e) => ToolCallResult::from(Err(ErrorData {
                code: ErrorCode::INTERNAL_ERROR,
                message: Cow::from(e.to_string()),
                data: None,
            })),
        }
    }

    async fn call_sub_recipe_tool(
        &self,
        tool_name: &str,
        params: Value,
        tasks_manager: &TasksManager,
    ) -> Result<Vec<Content>, ErrorData> {
        let sub_recipe = self.sub_recipes.get(tool_name).ok_or_else(|| {
            let sub_recipe_name = tool_name
                .strip_prefix(SUB_RECIPE_TASK_TOOL_NAME_PREFIX)
                .and_then(|s| s.strip_prefix("_"))
                .ok_or_else(|| ErrorData {
                    code: ErrorCode::INVALID_PARAMS,
                    message: Cow::from(format!(
                        "Invalid sub-recipe tool name format: {}",
                        tool_name
                    )),
                    data: None,
                })
                .unwrap();

            ErrorData {
                code: ErrorCode::INVALID_PARAMS,
                message: Cow::from(format!("Sub-recipe '{}' not found", sub_recipe_name)),
                data: None,
            }
        })?;
        let output = create_sub_recipe_task(sub_recipe, params, tasks_manager)
            .await
            .map_err(|e| ErrorData {
                code: ErrorCode::INTERNAL_ERROR,
                message: Cow::from(format!("Sub-recipe task creation failed: {}", e)),
                data: None,
            })?;
        Ok(vec![Content::text(output)])
    }
}
