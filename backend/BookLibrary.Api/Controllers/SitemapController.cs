using System.Text;
using System.Xml;
using BookLibrary.Api.Filters;
using BookLibrary.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Route("api/sitemap.xml")]
public class SitemapController : ControllerBase
{
    private const int MaxBookEntries = 49_900; // leave headroom under the 50k spec cap for the static URLs.
    private const int CacheSeconds = 3600;

    private readonly IBookRepository _books;
    private readonly IConfiguration _config;

    public SitemapController(IBookRepository books, IConfiguration config)
    {
        _books = books;
        _config = config;
    }

    [HttpGet]
    [SkipResponseWrapping]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var siteUrl = (_config["Seo:SiteUrl"] ?? string.Empty).TrimEnd('/');
        if (string.IsNullOrWhiteSpace(siteUrl))
        {
            siteUrl = $"{Request.Scheme}://{Request.Host}";
        }

        var books = await _books.ListPublishedSitemapEntriesAsync(MaxBookEntries, ct);

        var sb = new StringBuilder();
        var settings = new XmlWriterSettings
        {
            Indent = false,
            Async = true,
            OmitXmlDeclaration = false,
            Encoding = new UTF8Encoding(false),
        };

        using (var sw = new StringWriter(sb))
        using (var w = XmlWriter.Create(sw, settings))
        {
            await w.WriteStartDocumentAsync();
            w.WriteStartElement("urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");

            WriteUrl(w, $"{siteUrl}/", null, "weekly", "1.0");
            WriteUrl(w, $"{siteUrl}/browse", null, "daily", "0.9");

            foreach (var (id, updatedAt) in books)
            {
                WriteUrl(
                    w,
                    $"{siteUrl}/books/{id}",
                    updatedAt,
                    "weekly",
                    "0.8");
            }

            await w.WriteEndElementAsync();
            await w.WriteEndDocumentAsync();
        }

        Response.Headers.CacheControl = $"public, max-age={CacheSeconds}";
        return Content(sb.ToString(), "application/xml", Encoding.UTF8);
    }

    private static void WriteUrl(XmlWriter w, string loc, DateTime? lastmod, string changefreq, string priority)
    {
        w.WriteStartElement("url");
        w.WriteElementString("loc", loc);
        if (lastmod.HasValue)
        {
            w.WriteElementString("lastmod", lastmod.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"));
        }
        w.WriteElementString("changefreq", changefreq);
        w.WriteElementString("priority", priority);
        w.WriteEndElement();
    }
}
