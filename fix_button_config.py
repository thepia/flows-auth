import re

# Read the file
with open('src/stores/auth-store.ts', 'r') as f:
    content = f.read()

# Replace the getButtonConfig signature and parameter handling
old_signature = r'''    // UI Configuration \(state-aware\)
    getButtonConfig: \(
      liveEmailOrState\?\: string \| \{ email\?\: string; \[key: string\]: unknown \}
    \): ButtonConfig => \{
      const currentState = get\(store\);
      const \{
        email: storeEmail,
        loading,
        userExists,
        hasPasskeys,
        hasValidPin,
        fullName,
        signInState
      \} = currentState;

      // Handle both new string format and legacy object format
      let email: string;
      if \(typeof liveEmailOrState === 'string'\) \{
        // New format: string parameter
        email = liveEmailOrState \|\| storeEmail;
      \} else if \(liveEmailOrState && typeof liveEmailOrState === 'object'\) \{
        // Legacy format: object parameter \(for tests\)
        email = liveEmailOrState\.email \|\| storeEmail;
      \} else \{
        // No parameter: use store email
        email = storeEmail;
      \}'''

new_signature = '''    // UI Configuration (state-aware)
    getButtonConfig: (email?: string): ButtonConfig => {
      const currentState = get(store);
      const {
        email: storeEmail,
        loading,
        userExists,
        hasPasskeys,
        hasValidPin,
        fullName,
        signInState
      } = currentState;

      // Use provided email or fall back to store email
      const effectiveEmail = email || storeEmail;'''

# Replace the signature and parameter handling
new_content = re.sub(old_signature, new_signature, content, flags=re.MULTILINE)

# Now replace all references to the old 'email' variable with 'effectiveEmail'
# But be careful to only replace in the getButtonConfig function
# Find the function and replace within it
def replace_email_in_function(match):
    function_body = match.group(0)
    # Replace 'email' with 'effectiveEmail' but be careful about context
    # Replace patterns like: !email, email.trim(), email?.trim(), etc.
    function_body = re.sub(r'\bemail\b(?=\s*[?.!]|\s*\|\||\s*&&|\s*,|\s*;|\s*\))', 'effectiveEmail', function_body)
    return function_body

# Find the getButtonConfig function and replace email references within it
pattern = r'(getButtonConfig: \(email\?\: string\): ButtonConfig => \{.*?return finalConfig;[\s]*\})'
new_content = re.sub(pattern, replace_email_in_function, new_content, flags=re.DOTALL)

# Write the fixed content
with open('src/stores/auth-store.ts', 'w') as f:
    f.write(new_content)

print("✅ Fixed getButtonConfig signature and parameter handling")
