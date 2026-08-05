import { query as sqlQuery } from "../../../db/sqlite.js";

export const prerender = false;

export async function PUT({ request }) {

    try {

        const data = await request.json();

        await sqlQuery.run(
            `
            UPDATE blogs
            SET
                title=?,
                slug=?,
                category=?,
                short_description=?,
                content=?,
                author=?,
                tags=?,
                seo_title=?,
                seo_description=?,
                status=?
            WHERE id=?
            `,
            [
                data.title,
                data.slug,
                data.category,
                data.short_description,
                data.content,
                data.author,
                data.tags,
                data.seo_title,
                data.seo_description,
                data.status,
                data.id
            ]
        );

        return new Response(
            JSON.stringify({
                success: true
            }),
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
                success: false,
                error: err.message
            }),
            {
                status: 500
            }
        );

    }

}