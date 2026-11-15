function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tokenizeCode(code, lang) {
  const csharpKeywords = '\\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|async|await|record|var|get|set|init|value|yield|import|export|from|function|let|type|any)\\b';
  const knownTypes = '\\b(Task|IResult|IActionResult|HttpContext|WebApplication|WebApplicationBuilder|IServiceCollection|DbContext|ClaimsPrincipal|ClaimsIdentity|Claim|StringValues|EndpointFilterInvocationContext|EndpointFilterInvocationDelegate|RouteValueDictionary|ActionContext|ControllerBase|Controller|ViewResult|JsonResult|ContentResult|StatusCodeResult|RedirectResult|RedirectToActionResult|LocalRedirectResult)\\b';

  const regex = new RegExp([
    '(?<comment>\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/)',
    '(?<string>@"(?:""|[^"])*"|"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')',
    '(?<directive>@[A-Za-z0-9_]+)',
    '(?<number>\\b\\d+(\\.\\d+)?([fFdDmMuUlL])?\\b)',
    `(?<keyword>${csharpKeywords})`,
    `(?<type>${knownTypes})`,
    '(?<method>\\b[A-Za-z0-9_]+(?=\\())',
    '(?<other>[\\s\\S])'
  ].join('|'), 'g');

  let result = '';
  let match;
  while ((match = regex.exec(code)) !== null) {
    const g = match.groups;
    if (g.comment) {
      result += `<span class="token-comment">${escapeHtml(g.comment)}</span>`;
    } else if (g.string) {
      if (lang === 'json' && /:\s*$/.test(code.slice(match.index + g.string.length, match.index + g.string.length + 3))) {
        result += `<span class="token-property">${escapeHtml(g.string)}</span>`;
      } else {
        result += `<span class="token-string">${escapeHtml(g.string)}</span>`;
      }
    } else if (g.directive) {
      result += `<span class="token-keyword">${escapeHtml(g.directive)}</span>`;
    } else if (g.number) {
      result += `<span class="token-number">${escapeHtml(g.number)}</span>`;
    } else if (g.keyword) {
      result += `<span class="token-keyword">${escapeHtml(g.keyword)}</span>`;
    } else if (g.type) {
      result += `<span class="token-type">${escapeHtml(g.type)}</span>`;
    } else if (g.method) {
      result += `<span class="token-method">${escapeHtml(g.method)}</span>`;
    } else {
      result += escapeHtml(g.other);
    }
  }
  return result;
}

const sample = `
public class LoggingFilter : IEndpointFilter
{
  public Task<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterInvocationDelegate next)
  {
    // Log request
    Console.WriteLine("Handling request...");
    return next(context);
  }
}
`;

console.log(tokenizeCode(sample, 'csharp'));
