namespace BookLibrary.Api.Contracts.Responses;

public record BookSummaryDto(
    Guid Id,
    string Title,
    string Language,
    int? Year,
    string? CoverUrl,
    decimal AverageRating,
    int ReviewCount,
    Guid AuthorId,
    string AuthorName,
    Guid GenreId,
    string GenreName);

public record BookDetailDto(
    Guid Id,
    string Title,
    string Description,
    string Language,
    int? Year,
    string? Isbn,
    string? CoverUrl,
    string? FileUrl,
    long? FileSizeBytes,
    int? PageCount,
    Guid AuthorId,
    string AuthorName,
    Guid GenreId,
    string GenreName,
    bool IsPublished,
    bool IsFeatured,
    int ViewCount,
    int DownloadCount,
    decimal AverageRating,
    int ReviewCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record DownloadResponse(string FileUrl);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);
