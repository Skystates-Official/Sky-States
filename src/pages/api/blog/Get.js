import { query as sqlQuery } from "../../../db/sqlite.js";

export const prerender = false;

export async function GET({ url }) {

    try {

        const id = url.searchParams.get("id");

        const blog = await sqlQuery.get(
            `
            SELECT *
            FROM blogs
            WHERE id = ?
            `,
            [id]
        );

        return new Response(
            JSON.stringify(blog),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (err) {

        return new Response(
            JSON.stringify({
                error: err.message
            }),
            {
                status: 500
            }
        );

    }

}