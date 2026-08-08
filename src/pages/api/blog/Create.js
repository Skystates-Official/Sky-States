import { query as sqlQuery } from "../../../db/sqlite.js";
import fs from "fs/promises";
import path from "path";

export const prerender = false;


export async function POST({ request }) {

    try {

        const formData = await request.formData();


        const title = formData.get("title");

        const slugFromForm = formData.get("slug");


        const slug =
            slugFromForm && slugFromForm.trim() !== ""
                ? slugFromForm
                : title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");



        const category = formData.get("category");

        const short_description = formData.get("short_description");

        const content = formData.get("content");


        const author = formData.get("author");

        const tags = formData.get("tags");

        const keywords = formData.get("keywords");

        const canonical = formData.get("canonical");


        const seo_title = formData.get("seo_title");

        const seo_description = formData.get("seo_description");


        const status = formData.get("status");



        const image = formData.get("image");

        let imagePath = "";



        if (image && image.size > 0) {


            const bytes = await image.arrayBuffer();

            const buffer = Buffer.from(bytes);


            const uploadDir = path.join(
                process.cwd(),
                "public",
                "uploads",
                "blogs"
            );


            await fs.mkdir(uploadDir, { recursive: true });



            const fileName = `${Date.now()}-${image.name}`;


            const filePath = path.join(
                uploadDir,
                fileName
            );


            await fs.writeFile(
                filePath,
                buffer
            );


            imagePath = `/uploads/blogs/${fileName}`;

        }



        console.log("Image Path:", imagePath);



        await sqlQuery.run(
`
INSERT INTO blogs
(
title,
slug,
category,
author,
tags,
keywords,
canonical,
short_description,
content,
image,
seo_title,
seo_description,
status
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
imagePath,
seo_title,
seo_description,
status
]
);



        return new Response(
            JSON.stringify({

                success: true,

                message: "Blog created successfully"

            }),
            {

                status: 200,

                headers: {

                    "Content-Type": "application/json"

                }

            }
        );



    } catch(error) {


        console.error(error);



        return new Response(
            JSON.stringify({

                success: false,

                error: error.message

            }),
            {

                status: 500

            }
        );

    }

}