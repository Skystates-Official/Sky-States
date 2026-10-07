import { query as sqlQuery } from "../db/sqlite.js";

export async function getHowTos() {

    const how_tos = await sqlQuery.all(`
        SELECT *
        FROM how_tos
        WHERE status='published'
        ORDER BY created_at DESC
    `);

    return how_tos;

}

export async function getHowTo(slug){

    const how_to = await sqlQuery.get(`
        SELECT *
        FROM how_tos
        WHERE slug=?
    `,[slug]);

    return how_to;

}