using AutoMapper;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Entities;

namespace BookLibrary.Api.Mapping;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Book, BookSummaryDto>()
            .ForCtorParam("AuthorName", o => o.MapFrom(s => s.Author != null ? s.Author.Name : string.Empty))
            .ForCtorParam("GenreName", o => o.MapFrom(s => s.Genre != null ? s.Genre.Name : string.Empty));

        CreateMap<Book, BookDetailDto>()
            .ForCtorParam("AuthorName", o => o.MapFrom(s => s.Author != null ? s.Author.Name : string.Empty))
            .ForCtorParam("GenreName", o => o.MapFrom(s => s.Genre != null ? s.Genre.Name : string.Empty));

        CreateMap<Author, AuthorDto>()
            .ForCtorParam("BookCount", o => o.MapFrom(s => s.Books != null ? s.Books.Count : 0));

        CreateMap<Genre, GenreDto>()
            .ForCtorParam("BookCount", o => o.MapFrom(s => s.Books != null ? s.Books.Count : 0));

        CreateMap<Review, AdminReviewDto>()
            .ForCtorParam("BookTitle", o => o.MapFrom(s => s.Book != null ? s.Book.Title : string.Empty));
    }
}
