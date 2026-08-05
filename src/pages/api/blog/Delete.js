import { query as sqlQuery } from "../../../db/sqlite.js";
import fs from "fs/promises";
import path from "path";

export const prerender = false;

export async function DELETE({ request }) {

    try {

        const { id } = await request.json();

        // Get image path before deleting
        const blog = await sqlQuery.get(
            "SELECT image FROM blogs WHERE id = ?",
            [id]
        );

        // Delete image from uploads folder
        if (blog?.image) {

            const imagePath = path.join(
                process.cwd(),
                "public",
                blog.image
            );

            try {
                await fs.unlink(imagePath);
            } catch (e) {
                console.log("Image not found, skipping delete.");
            }

        }

        // Delete database record
        await sqlQuery.run(
            "DELETE FROM blogs WHERE id = ?",
            [id]
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