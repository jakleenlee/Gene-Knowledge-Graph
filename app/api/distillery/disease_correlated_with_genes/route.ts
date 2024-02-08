import neo4j from "neo4j-driver"
import { neo4jDriver } from "../../../../utils/neo4j"
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from 'zod';
import { convert_query } from "@/utils/helper";

// This function returns a gene list based on a search term
const InputSchema = z.object({
    term: z.string().optional(),
    field: z.string().optional(),
    limit: z.number().optional()
})
export async function GET(req: NextRequest) {
    try {
        const session = neo4jDriver.session({
            defaultAccessMode: neo4j.session.READ
        })
        try {
            // const node_properties:{[key:string]: Array<string>} = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/search_properties`)).json()
            const {term="", field="label", limit=100} = InputSchema.parse(convert_query(req))
            // const type = "Disease"
            // if (node_properties[type] === undefined) {
            //     return NextResponse.json({error: `Invalid type: ${type}`}, {status: 400})
            // }
            // if (node_properties[type].indexOf(field) === -1) {
            //     return NextResponse.json({error: `Invalid field: ${field}`}, {status: 400})
            // }
            let query = `MATCH p=(a:Disease)-[r1:\`gene associated with disease or phenotype\`]-(b:Gene)`
            if (term) {
                query = query + ` WHERE a.${field} =~ $term`

            }
            query = query + "  RETURN a LIMIT TOINTEGER($limit)"
            const results = await session.readTransaction(txc => txc.run(query, {limit, term: `(?i).*${term}.*`}))
            const records = {}
            for (const record of results.records) {
                const a = record.get('a')
                const value = a.properties[field]
                if (value) records[value] = a.properties
            }
            return NextResponse.json(records, {status: 200})
            return
        } catch (error) {
            console.log(error)
            return NextResponse.json(error, {status: 400})
        } finally {
            session.close()
        }
    } catch (error) {
        return NextResponse.json(error, {status: 500})
    }
     
}