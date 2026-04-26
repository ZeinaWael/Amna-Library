namespace BookLibrary.Api.Entities;

public class Book
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public string Language { get; set; } = "en";
    public int? Year { get; set; }
    public string? Isbn { get; set; }
    public string? CoverUrl { get; set; }
    public string? FileUrl { get; set; }
    public long? FileSizeBytes { get; set; }
    public int? PageCount { get; set; }

    public Guid AuthorId { get; set; }
    public Author Author { get; set; } = default!;

    public Guid GenreId { get; set; }
    public Genre Genre { get; set; } = default!;

    public bool IsPublished { get; set; }
    public bool IsFeatured { get; set; }
    public int ViewCount { get; set; }
    public int DownloadCount { get; set; }
    public decimal AverageRating { get; set; }
    public int ReviewCount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<Review> Reviews { get; set; } = new();
}
