using BookLibrary.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookLibrary.Api.Migrations;

/// <summary>
/// Hand-rolled migration: adds the <c>password_changed_at</c> column to the
/// <c>users</c> table. The repo has no prior baseline migration *file*, but
/// the DB's __EFMigrationsHistory contains an "InitialCreate" row from a
/// previous apply, so this stacks on top of it.
/// </summary>
[DbContext(typeof(AppDbContext))]
[Migration("20260508120000_AddPasswordChangedAt")]
public partial class AddPasswordChangedAt : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<System.DateTime>(
            name: "password_changed_at",
            table: "users",
            type: "timestamp with time zone",
            nullable: false,
            defaultValueSql: "CURRENT_TIMESTAMP");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "password_changed_at",
            table: "users");
    }
}
