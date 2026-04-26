namespace BookLibrary.Api.Contracts.Requests;

public record CreateReviewRequest(string ReviewerName, string ReviewerEmail, int Rating, string Content);
public record ReviewQuery(string? Status = null, int Page = 1, int PageSize = 20);
