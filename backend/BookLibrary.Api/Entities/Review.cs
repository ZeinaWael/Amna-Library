namespace BookLibrary.Api.Entities;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookId { get; set; }
    public Book Book { get; set; } = default!;
    public string ReviewerName { get; set; } = default!;
    public string ReviewerEmail { get; set; } = default!;
    public int Rating { get; set; }
    public string Content { get; set; } = default!;
    public string Status { get; set; } = ReviewStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
