import { describe, expect, it } from "vitest";
import { sanitizePortalHtml } from "./sanitize-portal-html";

describe("sanitizePortalHtml", () => {
  it("strips script tags", () => {
    const result = sanitizePortalHtml('<p>Hello</p><script>alert("x")</script>');
    expect(result).not.toContain("script");
    expect(result).toContain("Hello");
  });

  it("preserves safe markup with class and style", () => {
    const result = sanitizePortalHtml('<div class="card" style="padding: 1rem"><p>Content</p></div>');
    expect(result).toContain('class="card"');
    expect(result).toContain("padding: 1rem");
    expect(result).toContain("Content");
  });

  it("preserves iframe embeds with allowed attributes", () => {
    const input =
      '<iframe src="https://www.youtube.com/embed/abc123" width="560" height="315" frameborder="0" allow="accelerometer; autoplay" allowfullscreen title="Video"></iframe>';
    const result = sanitizePortalHtml(input);
    expect(result).toContain("<iframe");
    expect(result).toContain('src="https://www.youtube.com/embed/abc123"');
    expect(result).toContain("allowfullscreen");
    expect(result).toContain('title="Video"');
  });

  it("strips dangerous event handler attributes", () => {
    const result = sanitizePortalHtml('<div onclick="alert(1)">Click</div>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click");
  });
});
