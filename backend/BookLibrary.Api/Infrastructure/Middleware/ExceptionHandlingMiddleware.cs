using System.Text.Json;
using BookLibrary.Api.Contracts;

namespace BookLibrary.Api.Infrastructure.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await _next(ctx); }
        catch (AppException ex)
        {
            _logger.LogWarning(ex, "Handled domain exception ({Status})", ex.StatusCode);
            await WriteAsync(ctx, ex.StatusCode, ApiResponse.Fail(ex.Message, ex.Errors));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteAsync(ctx, 500, ApiResponse.Fail("An unexpected error occurred."));
        }
    }

    private static async Task WriteAsync(HttpContext ctx, int status, ApiResponse body)
    {
        if (ctx.Response.HasStarted) return;
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOpts));
    }
}

public class AppException : Exception
{
    public int StatusCode { get; }
    public IReadOnlyList<string> Errors { get; }
    public AppException(int status, string message, IEnumerable<string>? errors = null) : base(message)
    {
        StatusCode = status;
        Errors = (errors ?? Array.Empty<string>()).ToArray();
    }

    public static AppException NotFound(string what) => new(404, $"{what} not found.");
    public static AppException Conflict(string message) => new(409, message);
    public static AppException BadRequest(string message, IEnumerable<string>? errors = null) => new(400, message, errors);
    public static AppException Unauthorized(string message = "Unauthorized.") => new(401, message);
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseExceptionHandling(this IApplicationBuilder app)
        => app.UseMiddleware<ExceptionHandlingMiddleware>();
}
