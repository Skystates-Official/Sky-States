// import { query as sqlQuery } from "../../../db/sqlite.js";

// export const prerender = false;


// export async function POST({ request }) {

//     try {

//         const formData = await request.formData();


//         const title = formData.get("title");
//         const category = formData.get("category");
//         const short_description = formData.get("short_description");
//         const content = formData.get("content");
//         const author = formData.get("author");
//         const tags = formData.get("tags");
//         const seo_title = formData.get("seo_title");
//         const seo_description = formData.get("seo_description");
//         const status = formData.get("status");


//         const slug = title
//             .toLowerCase()
//             .replace(/[^a-z0-9]+/g, "-")
//             .replace(/(^-|-$)/g, "");



//         await sqlQuery.run(
//             `
//             INSERT INTO blogs
//             (
//                 title,
//                 slug,
//                 category,
//                 short_description,
//                 content,
//                 author,
//                 tags,
//                 seo_title,
//                 seo_description,
//                 status
//             )
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//             `,
//             [
//                 title,
//                 slug,
//                 category,
//                 short_description,
//                 content,
//                 author,
//                 tags,
//                 seo_title,
//                 seo_description,
//                 status
//             ]
//         );


//         return new Response(
//             JSON.stringify({
//                 success:true,
//                 message:"Blog created successfully"
//             }),
//             {
//                 status:200,
//                 headers:{
//                     "Content-Type":"application/json"
//                 }
//             }
//         );


//     } catch(error){

//         console.error(error);


//         return new Response(
//             JSON.stringify({
//                 success:false,
//                 error:error.message
//             }),
//             {
//                 status:500
//             }
//         );

//     }

// }