namespace BookLibrary.Api.Contracts.Requests;

public record BookQuery(
    int Page = 1,
    int PageSize = 12,
    string? Genre = null,
    string? Language = null,
    int? Year = null,
    string? Sort = null);

public record BookSearchQuery(string Q, int Page = 1, int PageSize = 12);

public record CreateBookRequest(
    string Title,
    string Description,
    string Language,
    int? Year,
    string? Isbn,
    Guid AuthorId,
    Guid GenreId,
    bool IsFeatured = false);

public record UpdateBookRequest(
    string Title,
    string Description,
    string Language,
    int? Year,
    string? Isbn,
    Guid AuthorId,
    Guid GenreId,
    bool IsFeatured);

public record PublishBookRequest(bool IsPublished);
