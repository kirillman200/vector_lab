(function registerWebMcpTools() {
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext?.registerTool) return;

  const registrations = new AbortController();
  const options = { signal: registrations.signal };
  const objectSchema = (properties = {}, required = []) => ({
    type: "object",
    properties,
    required,
    additionalProperties: false,
  });

  const tools = [
    {
      name: "get_current_svg",
      title: "Get current SVG",
      description: "Return the current sanitized SVG markup from the SVG Vector Lab editor.",
      inputSchema: objectSchema(),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => ({ svg: serializeCurrentSvg() }),
    },
    {
      name: "set_svg_markup",
      title: "Set SVG markup",
      description: "Replace the current drawing with SVG markup. The editor sanitizes scripts, event handlers, and unsafe URLs before displaying it.",
      inputSchema: objectSchema(
        {
          svg: {
            type: "string",
            description: "A complete SVG document or svg element.",
            minLength: 1,
            maxLength: 1000000,
          },
        },
        ["svg"],
      ),
      execute: async ({ svg }) => {
        if (typeof svg !== "string" || svg.length > 1000000 || !/<svg[\s>]/i.test(svg)) {
          throw new TypeError("svg must be a complete SVG string no larger than 1,000,000 characters");
        }
        if (!loadSvg(svg)) throw new TypeError("svg must contain valid SVG markup with an svg root");
        return { success: true, svg: serializeCurrentSvg() };
      },
    },
    {
      name: "load_sample_svg",
      title: "Load sample SVG",
      description: "Replace the current drawing with SVG Vector Lab's built-in sample artwork.",
      inputSchema: objectSchema(),
      execute: async () => {
        if (!loadSvg(SAMPLE_SVG)) throw new Error("The built-in sample SVG could not be loaded");
        setStatus("Sample SVG loaded by browser agent.");
        return { success: true, svg: serializeCurrentSvg() };
      },
    },
    {
      name: "fit_svg_to_view",
      title: "Fit SVG to view",
      description: "Fit and center the current SVG drawing in the visible editor canvas.",
      inputSchema: objectSchema(),
      execute: async () => {
        fitToView({ announce: false });
        return { success: true };
      },
    },
  ];

  Promise.allSettled(tools.map((tool) => modelContext.registerTool(tool, options)));
  window.addEventListener("pagehide", () => registrations.abort(), { once: true });
})();
