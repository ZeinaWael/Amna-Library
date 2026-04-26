namespace BookLibrary.Api.Contracts.Responses;

public record PublicReviewDto(Guid Id, string MaskedReviewerName, int Rating, string Content, DateTime CreatedAt);

public record AdminReviewDto(
    Guid Id,
    Guid BookId,
    string BookTitle,
    string ReviewerName,
    string ReviewerEmail,
    int Rating,
    string Content,
    string Status,
    DateTime CreatedAt);

public record LatestReviewDto(
    Guid BookId,
    string BookTitle,
    string? CoverUrl,
    string MaskedReviewerName,
    int Rating,
    string Content,
    DateTime CreatedAt);
