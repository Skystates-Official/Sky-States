import { query as sqlQuery } from "../db/sqlite.js";


export async function getBlogs() {

    const blogs = await sqlQuery.all(`
        SELECT *
        FROM blogs
        WHERE status='published'
        ORDER BY created_at DESC
    `);

    return blogs;

}


export async function getBlog(slug){

    const blog = await sqlQuery.get(`
        SELECT *
        FROM blogs
        WHERE slug=?
    `,[slug]);

    return blog;

}