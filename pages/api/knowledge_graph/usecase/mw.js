import fetch from "node-fetch";
import neo4j from "neo4j-driver"
import { neo4jDriver } from "../../../../utils/neo4j"
import { default_get_node_color_and_type } from "../index";
import {resolve_results, cors, runMiddleware} from '../index'

async function process_query({session, term, limit, schema, aggr_scores, colors, field }) {
    const query = `
        MATCH p=(a:Disease {label: $term})-[r1:\`correlated with condition\`]-(b)-[r2:\`bioactivity\`]-(c:Gene)
        RETURN p, NODES(p) as n, RELATIONSHIPS(p) as r
        ORDER BY r1.evidence DESC, r2.evidence DESC
        LIMIT TOINTEGER($limit)
        UNION
        MATCH p=(a:Disease {label: $term})-[r1:\`correlated with condition\`]-(b)-[r2:\`bioactivity\`]-(c:Gene)-[r3:\`expresses\`]-(d:Tissue)
        RETURN p, NODES(p) as n, RELATIONSHIPS(p) as r
        ORDER BY r1.evidence DESC, r2.evidence DESC, r3.evidence DESC
        LIMIT TOINTEGER($limit)
        UNION
        MATCH p=(a:Disease {label: $term})-[r1:\`correlated with condition\`]-(b:Drug)-[r2:\`causally influences\`]-(c:Gene)-[r3:\`bioactivity\`]-(d:Drug)
        RETURN p, NODES(p) as n, RELATIONSHIPS(p) as r
        ORDER BY r1.evidence DESC, r2.evidence DESC, r3.evidence DESC
        LIMIT TOINTEGER($limit)
        UNION
        MATCH p=(a:Disease {label: $term})-[r1:\`correlated with condition\`]-(b:Drug)-[r2:\`causally influences\`]-(c:Gene)-[r3:\`expresses\`]-(d:Tissue)
        RETURN p, NODES(p) as n, RELATIONSHIPS(p) as r
        ORDER BY r1.evidence DESC, r2.evidence DESC, r3.evidence DESC
        LIMIT TOINTEGER($limit)
    `
    const results = await session.readTransaction(txc => txc.run(query, { term, limit }))
    return resolve_results({results, terms: [term], schema,  aggr_scores, colors, field})
}

export default async function query(req, res) {
    await runMiddleware(req, res, cors)
    const { filter } = await req.query
    const { term, limit=10, field="label" } = JSON.parse(filter)
    const schema = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/schema`)).json()
    const {aggr_scores, colors, edges} = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/initialize`)).json()
    const nodes = schema.nodes.map(i=>i.node)
    if (term === undefined) res.status(400).send("No term inputted")
    else { 
        try {
          const session = neo4jDriver.session({
              defaultAccessMode: neo4j.session.READ
          })
            try {
                console.log(term)
                const results = await process_query({session, term, limit, schema, aggr_scores, colors, field })
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
  