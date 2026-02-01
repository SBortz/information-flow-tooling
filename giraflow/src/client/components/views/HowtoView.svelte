<script lang="ts">
  import { modelStore } from "../../stores/model.svelte";
</script>

<div class="howto-container">
  <h1>How to use Giraflow</h1>
  <p class="intro">
    Giraflow is a file format for Event Modeling. Follow these steps to create and visualize your own event models.
  </p>

  <div class="steps">
    <div class="step">
      <div class="step-number">1</div>
      <div class="step-content">
        <h2>Download the Schema & AI Instructions</h2>
        <p>
          Get the JSON Schema file to enable autocompletion and validation in your editor.
          Most modern editors (VS Code, IntelliJ, etc.) support JSON Schema for intelligent suggestions.
        </p>
        <p>
          The AI Instructions guide helps you understand how to design event models effectively
          and can be used as context when working with AI assistants.
        </p>
        <div class="download-buttons">
          <a
            href="/giraflow.schema.json"
            class="download-button"
            download="giraflow.schema.json"
          >
            Download Schema
          </a>
          <a
            href="/giraflow-ai-instructions.md"
            class="download-button download-button-secondary"
            download="giraflow-ai-instructions.md"
          >
            Download AI Instructions
          </a>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-number">2</div>
      <div class="step-content">
        <h2>Create a Giraflow</h2>
        <p>
          Write your event model by hand or use AI to generate a scenario.
          Start with a simple happy path that describes a complete user journey.
        </p>
        <div class="tip">
          <strong>Tip:</strong> Ask an AI assistant to generate a Giraflow for your use case.
          Provide the schema and describe your domain.
        </div>
        <pre class="code-example">{`{
  "$schema": "./giraflow.schema.json",
  "name": "My Application",
  "description": "Event model for my app",
  "timeline": [
    { "type": "event", "name": "UserRegistered", "tick": 1 }
  ]
}`}</pre>
      </div>
    </div>

    <div class="step">
      <div class="step-number">3</div>
      <div class="step-content">
        <h2>Paste JSON in Editor</h2>
        <p>
          Switch to the <button class="inline-link" onclick={() => modelStore.setView('editor')}>Editor tab</button> and paste your JSON.
          The model will be validated and visualized automatically.
        </p>
        <div class="tip">
          <strong>Tip:</strong> Use the example dropdown to explore existing models and understand the structure.
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-number">4</div>
      <div class="step-content">
        <h2>Create Wireframes</h2>
        <p>
          Add wireframe references to your actors. Wireframes are simple HTML files placed
          in a <code>wireframes</code> folder next to your Giraflow file. They get rendered
          as a live preview and can be edited directly in the viewer.
        </p>
        <pre class="code-example">{`{
  "type": "actor",
  "name": "User",
  "tick": 2,
  "readsView": "ProductList",
  "sendsCommand": "AddToCart",
  "wireframes": ["add-to-cart-screen.html"]
}`}</pre>
        <p>
          The <a href="https://github.com/rough-stuff/wired-elements" target="_blank" rel="noopener noreferrer">wired-elements</a> library
          is included by default, giving you hand-drawn style UI components:
        </p>
        <pre class="code-example">{`<!DOCTYPE html>
<html>
<head>
  <script type="module" src="/lib/wired-elements.js"><\/script>
</head>
<body>
  <wired-card>
    <h2>Add to Cart</h2>
    <wired-input placeholder="Quantity"></wired-input>
    <wired-button>Add</wired-button>
  </wired-card>
</body>
</html>`}</pre>
        <div class="tip">
          <strong>Tip:</strong> You can also use PNG, JPG, or SVG images as wireframes for quick sketches.
          Or ask an AI to generate HTML wireframes based on your scenario description.
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-number">5</div>
      <div class="step-content">
        <h2>Add More Scenarios</h2>
        <p>
          Extend your model with edge cases, error flows, and alternative paths.
          Use specifications to define command behavior and state view projections.
        </p>
        <div class="tip">
          <strong>Tip:</strong> Think about what could go wrong. Add scenarios for validation errors,
          permission denied, not found, and other failure cases.
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-number">6</div>
      <div class="step-content">
        <h2>Validate Everything</h2>
        <p>
          Review your complete model using the different views:
        </p>
        <ul>
          <li><strong>Timeline:</strong> See the chronological flow of events</li>
          <li><strong>Slices & Scenarios:</strong> View vertical slices and their specifications</li>
          <li><strong>Info:</strong> Get an overview of all elements in your model</li>
        </ul>
        <p>
          Make sure all state views have source events, all commands produce events,
          and all actors interact with existing views and commands.
        </p>
      </div>
    </div>

    <div class="step">
      <div class="step-number">7</div>
      <div class="step-content">
        <h2>POC Implementation</h2>
        <p>
          Use your validated model as a specification for implementation.
          The structured format makes it easy to hand off to developers or AI coding assistants.
        </p>
        <div class="tip">
          <strong>Tip:</strong> Use the download button in the navigation bar to export your
          Giraflow as a ZIP file. It includes the model JSON, generated slices, wireframes, and
          the schema file - everything a developer or AI coding assistant needs to implement your design.
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .howto-container {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .intro {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .step {
    display: flex;
    gap: 1.25rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: var(--shadow-card);
  }

  .step-number {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    background: var(--color-command);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.125rem;
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-content h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .step-content p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 0.75rem;
  }

  .step-content ul {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0.75rem 0;
    padding-left: 1.25rem;
  }

  .step-content li {
    margin-bottom: 0.25rem;
  }

  .download-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .download-button {
    display: inline-block;
    background: var(--color-command);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: opacity 0.15s;
  }

  .download-button:hover {
    opacity: 0.9;
  }

  .download-button-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .download-button-secondary:hover {
    background: var(--bg-card);
  }

  .inline-link {
    background: none;
    border: none;
    color: var(--color-command);
    cursor: pointer;
    font-size: inherit;
    font-family: inherit;
    padding: 0;
    text-decoration: underline;
  }

  .inline-link:hover {
    opacity: 0.8;
  }

  .tip {
    background: var(--bg-secondary);
    border-left: 3px solid var(--color-command);
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
    border-radius: 0 0.25rem 0.25rem 0;
    margin: 0.75rem 0;
  }

  .tip strong {
    color: var(--text-primary);
  }

  .code-example {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    overflow-x: auto;
    margin: 0.75rem 0;
    color: var(--text-primary);
  }

  code {
    background: var(--bg-secondary);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: var(--font-mono);
    font-size: 0.85em;
  }
</style>
