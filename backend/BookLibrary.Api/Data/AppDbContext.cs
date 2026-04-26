using BookLibrary.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookLibrary.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Review> Reviews => Set<Review>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).IsRequired();
            e.Property(x => x.PasswordHash).IsRequired();
            e.Property(x => x.Role).IsRequired();
        });

        b.Entity<Author>(e =>
        {
            e.Property(x => x.Name).IsRequired();
        });

        b.Entity<Genre>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Name).IsRequired();
            e.Property(x => x.Slug).IsRequired();
        });

        b.Entity<Book>(e =>
        {
            e.Property(x => x.Title).IsRequired();
            e.Property(x => x.Description).IsRequired();
            e.Property(x => x.Language).IsRequired().HasMaxLength(8);
            e.Property(x => x.AverageRating).HasPrecision(3, 2);

            e.HasIndex(x => x.IsPublished);
            e.HasIndex(x => new { x.IsFeatured, x.IsPublished });
            e.HasIndex(x => x.GenreId);
            e.HasIndex(x => x.AuthorId);

            e.HasOne(x => x.Author).WithMany(a => a.Books)
                .HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Genre).WithMany(g => g.Books)
                .HasForeignKey(x => x.GenreId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Review>(e =>
        {
            e.Property(x => x.ReviewerName).IsRequired();
            e.Property(x => x.ReviewerEmail).IsRequired();
            e.Property(x => x.Content).IsRequired();
            e.Property(x => x.Status).IsRequired();
            e.ToTable(t => t.HasCheckConstraint("ck_reviews_rating", "rating >= 1 AND rating <= 5"));

            e.HasOne(x => x.Book).WithMany(k => k.Reviews)
                .HasForeignKey(x => x.BookId).OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(x => x.BookId);
        });
    }
}
