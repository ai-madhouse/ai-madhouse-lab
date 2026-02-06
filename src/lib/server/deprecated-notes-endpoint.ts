const deprecatedNotesMessage =
  "This endpoint is deprecated. Use the E2EE event log API at /api/notes-history.";

export function deprecatedNotesEndpointResponse() {
  return Response.json(
    {
      ok: false,
      error: "gone",
      message: deprecatedNotesMessage,
    },
    { status: 410 },
  );
}
