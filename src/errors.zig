const std = @import("std");

pub const CliError = union(enum) {
    missing_value: []const u8,
    unknown_option: []const u8,
    missing_home: []const u8,
    path_error: []const u8,
    cannot_read_input: []const u8,
    invalid_json: []const u8,
};

pub fn writeCliError(writer: *std.Io.Writer, cli_error: CliError) std.Io.Writer.Error!void {
    switch (cli_error) {
        .missing_value => |flag| try writer.print("Missing value for {s}\n", .{flag}),
        .unknown_option => |option| try writer.print("Unknown option: {s}\n", .{option}),
        .missing_home => |value| try writer.print("Cannot expand {s}: HOME and USERPROFILE are not set\n", .{value}),
        .path_error => |value| try writer.print("Cannot process path: {s}\n", .{value}),
        .cannot_read_input => |value| try writer.print("Cannot read {s}\n", .{value}),
        .invalid_json => |value| try writer.print("Invalid JSON in {s}\n", .{value}),
    }
}
