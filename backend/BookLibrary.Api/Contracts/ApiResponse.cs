namespace BookLibrary.Api.Contracts;

public record ApiResponse<T>(bool Success, T? Data, string? Message, IReadOnlyList<string> Errors)
{
    public static ApiResponse<T> Ok(T data) => new(true, data, null, Array.Empty<string>());
    public static ApiResponse<T> Fail(string message, IEnumerable<string>? errors = null) =>
        new(false, default, message, (errors ?? Array.Empty<string>()).ToArray());
}

public record ApiResponse(bool Success, object? Data, string? Message, IReadOnlyList<string> Errors)
{
    public static ApiResponse Ok(object? data = null) => new(true, data, null, Array.Empty<string>());
    public static ApiResponse Fail(string message, IEnumerable<string>? errors = null) =>
        new(false, null, message, (errors ?? Array.Empty<string>()).ToArray());
}
