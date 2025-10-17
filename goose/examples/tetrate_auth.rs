// Example of Tetrate Agent Router Service PKCE authentication
// Run with: cargo run --example tetrate_auth

use goose::config::signup_tetrate::TetrateAuth;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing Tetrate Agent Router Service PKCE flow...\n");

    // Create new PKCE auth flow
    let mut auth_flow = TetrateAuth::new()?;

    // Get the auth URL that would be opened
    let auth_url = auth_flow.get_auth_url();
    println!("Auth URL: {}", auth_url);
    println!("\nStarting authentication flow...");
    println!("This will:");
    println!("1. Open your browser to the auth page");
    println!("2. Start a local server on port 3000");
    println!("3. Wait for the callback\n");

    // Complete the full flow
    match auth_flow.complete_flow().await {
        Ok(api_key) => {
            println!("\n✅ Authentication successful!");
            println!(
                "API Key received: {}...",
                &api_key.chars().take(10).collect::<String>()
            );
            println!("\nYou can now use this API key with the Tetrate provider.");
        }
        Err(e) => {
            eprintln!("\n❌ Authentication failed: {}", e);
            eprintln!("Error details: {:?}", e);
        }
    }

    Ok(())
}
