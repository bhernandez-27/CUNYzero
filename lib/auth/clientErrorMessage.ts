/** Message from Next or Python auth JSON error bodies. */
export async function authErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: unknown; error?: unknown };
    if (typeof j.message === "string" && j.message.trim()) return j.message;
    if (typeof j.error === "string" && j.error.trim()) return j.error;
  } catch {
    // ignore
  }
  return `Something went wrong (${res.status})`;
}
