using Microsoft.Extensions.Options;

namespace BookLibrary.Api.Infrastructure.Storage;

public interface ISupabaseStorageClient
{
    Task<string> UploadAsync(string bucket, string objectKey, Stream content, string contentType, CancellationToken ct);
    Task<bool> DeleteAsync(string bucket, string objectKey, CancellationToken ct);
    (string bucket, string key)? ExtractKeyFromPublicUrl(string url);
}

public class SupabaseStorageClient : ISupabaseStorageClient
{
    private readonly HttpClient _http;
    private readonly SupabaseOptions _opt;
    private readonly ILogger<SupabaseStorageClient> _log;

    public SupabaseStorageClient(HttpClient http, IOptions<SupabaseOptions> opt, ILogger<SupabaseStorageClient> log)
    {
        _http = http;
        _opt = opt.Value;
        _log = log;
        if (!string.IsNullOrWhiteSpace(_opt.Url))
        {
            _http.BaseAddress = new Uri(_opt.Url.TrimEnd('/') + "/");
        }
        if (!string.IsNullOrWhiteSpace(_opt.ServiceRoleKey))
        {
            _http.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _opt.ServiceRoleKey);
        }
    }

    public async Task<string> UploadAsync(string bucket, string objectKey, Stream content, string contentType, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Put, $"storage/v1/object/{bucket}/{objectKey}");
        var streamContent = new StreamContent(content);
        streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
        req.Content = streamContent;
        req.Headers.Add("x-upsert", "true");

        using var res = await _http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Supabase upload failed: {(int)res.StatusCode} {body}");
        }
        return $"{_opt.Url.TrimEnd('/')}/storage/v1/object/public/{bucket}/{objectKey}";
    }

    public async Task<bool> DeleteAsync(string bucket, string objectKey, CancellationToken ct)
    {
        using var res = await _http.DeleteAsync($"storage/v1/object/{bucket}/{objectKey}", ct);
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync(ct);
            _log.LogWarning("Supabase delete failed ({Status}) for {Bucket}/{Key}: {Body}",
                (int)res.StatusCode, bucket, objectKey, body);
            return false;
        }
        return true;
    }

    public (string bucket, string key)? ExtractKeyFromPublicUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        const string marker = "/storage/v1/object/public/";
        var idx = url.IndexOf(marker, StringComparison.Ordinal);
        if (idx < 0) return null;
        var rest = url[(idx + marker.Length)..];
        var slash = rest.IndexOf('/');
        if (slash <= 0) return null;
        return (rest[..slash], rest[(slash + 1)..]);
    }
}
