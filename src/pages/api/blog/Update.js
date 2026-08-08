import { query as sqlQuery } from "../../../db/sqlite.js";

export const prerender = false;


export async function PUT({ request }) {

    try {

        const data = await request.json();


        const {
            id,
            title,
            slug,
            category,
            author,
            tags,
            keywords,
            canonical,
            short_description,
            content,
            seo_title,
            seo_description,
            status
        } = data;



        if (!id) {

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Blog ID is required"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

        }



        await sqlQuery.run(
`
UPDATE blogs
SET

title = ?,
slug = ?,
category = ?,
author = ?,
tags = ?,
keywords = ?,
canonical = ?,
short_description = ?,
content = ?,
seo_title = ?,
seo_description = ?,
status = ?,
updated_at = CURRENT_TIMESTAMP

WHERE id = ?

`,
[
    title,
    slug,
    category,
    author,
    tags,
    keywords,
    canonical,
    short_description,
    content,
    seo_title,
    seo_description,
    status,
    id
]
);



        return new Response(

            JSON.stringify({

                success: true,

                message: "Blog updated successfully"

            }),

            {
                status: 200,

                headers: {
                    "Content-Type": "application/json"
                }
            }

        );



    } catch(error) {


        console.error("Blog Update Error:", error);



        return new Response(

            JSON.stringify({

                success: false,

                error: error.message

            }),

            {
                status: 500,

                headers: {
                    "Content-Type": "application/json"
                }
            }

        );

    }

}