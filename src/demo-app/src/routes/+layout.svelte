<script>
  import '../app.css';
</script>

<div class="app">
  <header>
    <h1>@thepia/flows-auth Demo</h1>
    <p>Demonstration of the Flows Auth library with WebAuthn/passkey support</p>
  </header>

  <main>
    <slot />
  </main>

  <footer>
    <p>
      Built with <a href="https://github.com/thepia/flows-auth" target="_blank">@thepia/flows-auth</a>
      • <a href="https://thepia.com" target="_blank">Thepia</a>
    </p>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }

  header {
    text-align: center;
    padding: 2rem 0;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 2rem;
  }

  header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  header p {
    font-size: 1.125rem;
    color: #6b7280;
    margin: 0;
  }

  main {
    flex: 1;
    padding: 2rem 0;
  }

  footer {
    text-align: center;
    padding: 2rem 0;
    border-top: 1px solid #e5e7eb;
    margin-top: 2rem;
    color: #6b7280;
  }

  footer a {
    color: #3b82f6;
    text-decoration: none;
  }

  footer a:hover {
    text-decoration: underline;
  }
</style>
