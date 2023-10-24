import fetch from "node-fetch";
import neo4j from "neo4j-driver"
import { neo4jDriver } from "../../../../utils/neo4j";
import {resolve_results, cors, runMiddleware} from '../../knowledge_graph/index'

async function process_query({session, term, limit, relation, schema, aggr_scores, colors, field, type }) {
    const queries = []
    for (const rel of relation) {
        const q = `
                MATCH p=(t:\`${type}\` {label: $term})-[rel:expresses]-(g:Gene)-[r1:\`${rel}\`]-(a:Drug)
                RETURN p, nodes(p) as n, relationships(p) as r
                ORDER BY rel.evidence DESC, r1.evidence ${colors[rel].aggr_type} 
                LIMIT TOINTEGER($limit)
            `
            queries.push(q)
    }
    const query = queries.join(" UNION ")
    console.log(query)
    const results = await session.readTransaction(txc => txc.run(query, { term, limit }))
    return resolve_results({results, terms: [term], schema,  aggr_scores, colors, field})
}

export default async function query(req, res) {
    await runMiddleware(req, res, cors)
    const { filter } = await req.query
    const { start, start_term, limit=10, relation=['bioactivity', 'positively regulates', 'negatively regulates'], start_field="label" } = JSON.parse(filter)
    const schema = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/schema`)).json()
    const {aggr_scores, colors, edges} = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/initialize`)).json()
    const nodes = schema.nodes.map(i=>i.node)
    if (start_term === undefined) res.status(400).send("No term inputted")
    else { 
        try {
          const session = neo4jDriver.session({
              defaultAccessMode: neo4j.session.READ
          })
            try {
                const results = await process_query({session, type:start, term:start_term, limit, relation, schema, aggr_scores, colors, field:start_field })
                fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/counter/update`)
                res.status(200).send(results)
            } catch (e) {
              console.log(e.message)
              res.status(400).send(e.message)
            } finally {
              session.close()
            }
          } catch (e) {
              res.status(400).send(e.message)
          }
      }
  }
  