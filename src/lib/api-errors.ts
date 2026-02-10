export function apiError(message: string, status: number = 400) {
    return Response.json({ error: message }, { status });
}

export function apiSuccess(data: unknown) {
    return Response.json(data);
}
