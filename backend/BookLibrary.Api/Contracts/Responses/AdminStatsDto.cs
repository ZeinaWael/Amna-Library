namespace BookLibrary.Api.Contracts.Responses;

public record AdminStatsDto(
    int TotalBooks,
    int PublishedBooks,
    int PendingReviews,
    int ApprovedReviews,
    long TotalDownloads,
    long TotalViews);
