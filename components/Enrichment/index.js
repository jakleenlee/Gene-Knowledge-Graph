import dynamic from 'next/dynamic'
import { useRouter } from 'next/router';
import React, { useEffect, useState, useRef } from 'react';
import { layouts } from '../kg';
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery';
import fileDownload from 'js-file-download'
import Tooltip from '@mui/material/Tooltip';
import ShareIcon from '@mui/icons-material/Share';

import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'

import LinkIcon from '@mui/icons-material/Link'
import InputIcon from '@mui/icons-material/Input';
import RefreshIcon from '@mui/icons-material/Refresh';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Modal from '@mui/material/Modal';
import Grid from '@mui/material/Grid';
import { Stack } from '@mui/material';

// const Grid = dynamic(() => import('@mui/material/Grid'));
const Typography = dynamic(() => import('@mui/material/Typography'));
const CircularProgress = dynamic(() => import('@mui/material/CircularProgress'));

const TextField = dynamic(() => import('@mui/material/TextField'));
const CardContent = dynamic(() => import('@mui/material/CardContent'));
const Link = dynamic(() => import('@mui/material/Link'));

const CameraAltOutlinedIcon  = dynamic(() => import('@mui/icons-material/CameraAltOutlined'));

const GeneSetForm = dynamic(() => import('./form'), {ssr: false})
const Cytoscape = dynamic(() => import('../Cytoscape'), { ssr: false })
const TooltipCard = dynamic(async () => (await import('../misc')).TooltipCard);
const Legend = dynamic(async () => (await import('../misc')).Legend);
const NetworkTable =  dynamic(() => import('../network_table'))


export const delay = ms => new Promise(res => setTimeout(res, ms));

// https://blog.logrocket.com/accessing-previous-props-state-react-hooks/
export const usePrevious = (value) => {
    const ref = useRef();
    useEffect(() => {
      ref.current = value; //assign the value of ref to the argument
    },[value]); //this code will run when the value of 'value' changes
    return ref.current; //in the end, return the current ref value.
  }
  
export const shouldUpdateId = (query, prev_query) => {
    const {remove: curr_remove, page: curr_page, ...curr} = query
    const {remove: prev_remove, page: prev_page, ...prev} = prev_query
    if (JSON.stringify(curr) !== JSON.stringify(prev)) return true
    else return false
}

const Enrichment = ({default_options, libraries: libraries_list, schema, ...props}) => {
    const router = useRouter()
    const {page, ...rest} = router.query
    const [error, setError] = useState(null)
    const [openError, setOpenError] = useState(false)
    const [elements, setElements] = useState(null)
    const [node, setNode] = useState(null)
    const [focused, setFocused] = useState(null)
    const [loading, setLoading] = useState(false)
    const [edgeStyle, setEdgeStyle] = useState({label: 'data(label)'})
    const [layout, setLayout] = useState(0)
    const [anchorEl, setAnchorEl] = useState(null)
    const [collapsed, setCollapsed] = useState(null)
    const [shortId, setShortId] = useState(null)
    const [openShare, setOpenShare] = useState(false)
    const [query, setQuery] = useState(rest||{})
    const [id, setId] = useState(0)
    const prevQuery = usePrevious(router.query)


    const {userListId} = router.query
    
    const cyref = useRef(null);
    const tableref = useRef(null);


    const [controller, setController] = React.useState(null)

    const theme = useTheme();
    const sm = useMediaQuery(theme.breakpoints.down('md'));

    const tooltip_templates = {}
    for (const i of schema.nodes) {
        tooltip_templates[i.node] = i.display
    }

    for (const e of schema.edges) {
        for (const i of e.match) {
        tooltip_templates[i] = e.display
        }
    }

    

    const get_controller = () => {
        if (controller) controller.abort()
        const c = new AbortController()
        setController(c)
        return c
      }
    

    const handleClickMenu = (e) => {
		setAnchorEl(e.currentTarget);
	  };
	const handleCloseMenu = () => {
		setAnchorEl(null);
	};

    const handleClickFilter = (e) => {
		setCollapsed(e.currentTarget);
	  };
	const handleCloseFilter = () => {
		setCollapsed(null);
	};
    const fetch_kg = async () => {
        try {
            if (error !== null) {
                await delay(5000);
            }
            setCollapsed(null)
            const controller = get_controller()
            const {
                userListId,
                gene_limit=default_options.gene_limit,
                min_lib=default_options.min_lib,
                gene_degree=default_options.gene_degree,
                expand,
                remove
            } = router.query
            const libraries = router.query.libraries ? JSON.parse(router.query.libraries) : default_options.selected
            const res = await fetch(`${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/enrichment`,
            {
                method: "POST",
                body: JSON.stringify({
                    userListId,
                    libraries,
                    min_lib,
                    gene_limit,
                    gene_degree,
                    expand: expand,
                    remove: remove,
                }),
                signal: controller.signal
            })
            const results = (await res.json())
            // setId(id+1)
            if (results.message) {
                setError({message: "Error connecting to Enrichr, trying again...", type: "error"})
                setOpenError(true)
                if (shouldUpdateId(router.query, prevQuery)) setId(id+1)
            } else {
                setOpenError(false)
                setError(null)
                setLoading(false)
                setElements(results)
                if (shouldUpdateId(router.query, prevQuery)) setId(id+1)
            
            }
        } catch (error) {
            setError({message: "Error connecting to Enrichr, trying again...", type: "error"})
            setOpenError(true)
        }
    }

    

    useEffect(()=> {
        const get_shortId = async () => {
            const {link_id} = await (
                await fetch(`${process.env.NEXT_PUBLIC_ENRICHR_URL}/share?userListId=${userListId}`)
            ).json()
            setShortId(link_id)
        }
        if (userListId) {
            get_shortId()
        }
        // setCollapsed(userListId!==undefined)
    }, [userListId])

    useEffect(()=>{    
        const {page, ...rest} = router.query
        const userListId = rest.userListId
        if (userListId) {
            // setLoading(true)
            fetch_kg()
         }
    }, [router.query])

    useEffect(()=>{ 
        const {page, ...rest} = router.query
        setQuery(rest)
        const userListId = rest.userListId
        if (userListId && (error !== null && error.type === "error")) {
            setLoading(true)
            fetch_kg()
         }
    }, [error])
    
    return (
        <Grid container spacing={2} style={{paddingBottom: 10}} alignItems="center" justifyContent={"space-between"}>
            { elements !== null && <Grid item>
                <Tooltip title={collapsed ? "Show filters": "Hide filters"}>
                    <Button onClick={handleClickFilter}
                        startIcon={<InputIcon/>}
                        variant="contained"
                        size="large"
                        color="primary"
                    >
                        Input Gene Set
                    </Button>
                </Tooltip>
                <Menu
                    id="basic-menu"
                    anchorEl={collapsed}
                    open={collapsed!==null}
                    onClose={handleCloseFilter}
                    MenuListProps={{
                        'aria-labelledby': 'basic-button',
                    }}
                >
                    <CardContent style={{width: 1000}}><GeneSetForm router={router} default_options={default_options} setLoading={setLoading} libraries_list={libraries_list} get_controller={get_controller} {...props}/></CardContent>
                </Menu>
            </Grid>
            }
            { elements !== null && 
                <Grid item>
                    <Grid container direction={"row"} justifyContent="flex-end">
                        <Grid item>
                            <Tooltip title="Re-orient graph">
                                <IconButton variant='contained'
                                    disabled={elements===null}
                                    onClick={()=>{
                                        setId(id+1)
                                    }}
                                    style={{marginLeft: 5}}
                                >
                                    <RefreshIcon/>
                                </IconButton>
                            </Tooltip>
                        </Grid>
                        <Grid item>
                            <Tooltip title="Clear Graph">
                                <IconButton variant='contained'
                                    disabled={elements===null}
                                    onClick={()=>{
                                        setElements(null)
                                        router.push({
                                            pathname: `/${page}`,
                                        }, undefined, { shallow: true })
                                    }}
                                    style={{marginLeft: 5}}
                                >
                                    <HighlightOffIcon/>
                                </IconButton>
                            </Tooltip>
                        </Grid>
                        <Grid item>
                            <Tooltip title="Switch Graph Layout">
                                <IconButton variant='contained'
                                    disabled={elements===null}
                                    onClick={()=>{
                                        setLayout(layout + 1 === Object.keys(layouts).length ? 0: layout+1)
                                    }}
                                    style={{marginLeft: 5}}
                                >
                                    <FlipCameraAndroidIcon/>
                                </IconButton>
                            </Tooltip>
                        </Grid>
                        <Grid item>
                            <Tooltip title={edgeStyle.label ? "Hide edge labels": "Show edge labels"}>
                                <IconButton variant='contained'
                                    disabled={elements===null}
                                    onClick={()=>{
                                        if (edgeStyle.label) setEdgeStyle({})
                                        else setEdgeStyle({label: 'data(label)'})
                                    }}
                                    style={{marginLeft: 5}}
                                >
                                    {edgeStyle.label ? <VisibilityOffIcon/>: <VisibilityIcon/>}
                                </IconButton>
                            </Tooltip>
                        </Grid>
                        <Grid item>
                            <Tooltip title={"Download graph as an image file"}>
                                <IconButton onClick={handleClickMenu}
                                    aria-controls={anchorEl!==null ? 'basic-menu' : undefined}
                                    aria-haspopup="true"
                                    aria-expanded={anchorEl!==null ? 'true' : undefined}
                                ><CameraAltOutlinedIcon/></IconButton>
                            </Tooltip>
                            <Menu
                                id="basic-menu"
                                anchorEl={anchorEl}
                                open={anchorEl!==null}
                                onClose={handleCloseMenu}
                                MenuListProps={{
                                    'aria-labelledby': 'basic-button',
                                }}
                            >
                                <MenuItem key={'png'} onClick={()=> {
                                    handleCloseMenu()
                                    fileDownload(cyref.current.png({output: "blob"}), "network.png")
                                }}>PNG</MenuItem>
                                <MenuItem key={'jpg'} onClick={()=> {
                                    handleCloseMenu()
                                    fileDownload(cyref.current.jpg({output: "blob"}), "network.jpg")
                                }}>JPG</MenuItem>
                                <MenuItem key={'svg'} onClick={()=> {
                                    handleCloseMenu()
                                    fileDownload(cyref.current.svg({output: "blob"}), "network.svg")
                                }}>SVG</MenuItem>
                            </Menu>
                        </Grid>
                        <Grid item>
                            <Tooltip title={"View in Enrichr"}>
                                <IconButton 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={`https://maayanlab.cloud/Enrichr/enrich?dataset=${shortId}`}
                                >
                                    <LinkIcon/>
                                </IconButton>
                            </Tooltip>
                        </Grid>
                        <Grid item>
                            <Tooltip title={"Share"}>
                                <IconButton onClick={()=>setOpenShare(true)}>
                                    <ShareIcon/>
                                </IconButton>
                            </Tooltip>
                            <Modal
                                open={openShare}
                                onClose={()=>{
                                    setOpenShare(false)}
                                }
                                aria-labelledby="child-modal-title"
                                aria-describedby="child-modal-description"
                            >
                                <Grid container
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: 800,
                                        bgcolor: 'background.paper',
                                        border: '1px solid #000',
                                        boxShadow: 15,
                                        pt: 2,
                                        px: 4,
                                        pb: 3,
                                        }}
                                >
                                    <Grid item xs={12}>
                                        <Typography variant='h6'><b>Share Link</b></Typography>
                                    </Grid>
                                    <Grid item xs={11}>
                                        <TextField size='small'
                                            value={window.location}
                                            style={{width: "100%"}}
                                        />
                                    </Grid>
                                    <Grid item xs={1}>
                                        <Stack direction={"row"}>
                                            <Tooltip title="Copy Link">
                                                <IconButton onClick={()=>navigator.clipboard.writeText(window.location)}><ContentCopyIcon/></IconButton>
                                            </Tooltip>
                                            <Tooltip title="Close">
                                                <IconButton onClick={()=>setOpenShare(false)}><HighlightOffIcon/></IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Modal>
                        </Grid>
                    </Grid>
                </Grid>
            }
            
            <Grid item xs={12} style={{height: userListId ? 800: "100%"}}>
                {/* <Snackbar open={openError}
					anchorOrigin={{ vertical:"top", horizontal:"right" }}
					autoHideDuration={3000}
					onClose={()=>setOpenError(false)}
					message={(error || {}).message}
					action={
                        <IconButton size="small" onClick={()=>setOpenError(false)}>
                            <HighlightOffIcon/>
                        </IconButton>
					}
				/> */}
                { (userListId === undefined) ? <div align="center">
                    <Typography sx={{marginBottom: 3}}>Enter a set of Entrez gene symbols to perform enrichment analysis with &nbsp;
                        <Link href="https://maayanlab.cloud/Enrichr/" 
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Enrichr
                        </Link>.</Typography>
                    <GeneSetForm router={router} default_options={default_options} setLoading={setLoading} libraries_list={libraries_list} get_controller={get_controller} {...props}/>
                </div>
                : (elements === null) ? (
                <CircularProgress/>
                ) : elements.length === 0 ? (
                <div>No results</div>
                ) : loading ? 
                <CircularProgress/>:
                    <Cytoscape
                        key={id}
                        wheelSensitivity={0.1}
                        style={{
                        width: '100%',
                        height: '100%',
                        }}
                        stylesheet={[
                        {
                            selector: 'node',
                            style: {
                            'background-color': 'data(color)',
                            'label': 'data(label)',
                            "text-valign": "center",
                            "text-halign": "center",
                            'width': `mapData(node_type, 0, 1, 70, 150)`,
                            'height': `mapData(node_type, 0, 1, 70, 150)`,
                            }
                        },
                        {
                            selector: 'edge',
                            style: {
                            'curve-style': 'straight',
                            // 'opacity': '0.5',
                            'line-color': 'data(lineColor)',
                            'width': '3',
                            // 'label': 'data(label)',
                            "text-rotation": "autorotate",
                            "text-margin-x": "0px",
                            "text-margin-y": "0px",
                            'font-size': '12px',
                            'target-arrow-shape': `data(directed)`,
                            'target-endpoint': 'outside-to-node',
                            'source-endpoint': 'outside-to-node',
                            'target-arrow-color': 'data(lineColor)',
                            ...edgeStyle
                            }
                        },
                        {
                            selector: 'node.highlight',
                            style: {
                                'border-color': 'gray',
                                'border-width': '2px',
                                'font-weight': 'bold',
                                'font-size': '18px',
                                'width': `mapData(node_type, 0, 1, 90, 170)`,
                                'height': `mapData(node_type, 0, 1, 90, 170)`,
                            }
                        },
                        {
                            selector: 'node.focused',
                            style: {
                                'border-color': 'gray',
                                'border-width': '2px',
                                'font-weight': 'bold',
                                'font-size': '18px',
                                'width': `mapData(node_type, 0, 1, 90, 170)`,
                                'height': `mapData(node_type, 0, 1, 90, 170)`,
                            }
                        },
                        {
                            selector: 'edge.focusedColored',
                            style: {
                                'line-color': '#F8333C',
                                'width': '6'
                            }
                        },
                        {
                            selector: 'node.semitransp',
                            style:{ 'opacity': '0.5' }
                        },
                        {
                            selector: 'node.focusedSemitransp',
                            style:{ 'opacity': '0.5' }
                        },
                        {
                            selector: 'edge.colored',
                            style: {
                                'line-color': '#F8333C',
                                'target-arrow-color': '#F8333C',
                                'width': '6'
                            }
                        },
                        {
                            selector: 'edge.semitransp',
                            style:{ 'opacity': '0.5' }
                        },
                        {
                            selector: 'edge.focusedSemitransp',
                            style:{ 'opacity': '0.5' }
                        }
                        ]}
                        elements={elements}
                        layout={Object.values(layouts)[layout]}
                        cy={(cy) => {
                        cyref.current = cy
                        cy.on('click', 'node', function (evt) {
                        // setAnchorEl(null)
                        const node = evt.target.data()

                        if (focused && node.id === focused.id) {
                            const sel = evt.target;
                            cy.elements().removeClass('focusedSemitransp');
                            sel.removeClass('focused').outgoers().removeClass('focusedColored')
                            sel.incomers().removeClass('focusedColored')
                            // setNode({node: null, type: "focused"})
                            setFocused(null)
                        } else{
                            const sel = evt.target;
                            cy.elements().removeClass('focused');
                            cy.elements().removeClass('focusedSemitransp');
                            cy.elements().removeClass('focusedColored');
                            cy.elements().not(sel).addClass('focusedSemitransp');
                            sel.addClass('focused').outgoers().addClass('focusedColored')
                            sel.incomers().addClass('focusedColored')
                            sel.incomers().removeClass('focusedSemitransp')
                            sel.outgoers().removeClass('focusedSemitransp')
                            // setNode({node, type: "focused"})
                            setFocused(node)
                            setTimeout(()=>{
                            const sel = evt.target;
                            cy.elements().removeClass('focusedSemitransp');
                            sel.removeClass('focused').outgoers().removeClass('focusedColored')
                            sel.incomers().removeClass('focusedColored')
                            // setNode({node: null, type: "focused"})
                            setFocused(null)
                            }, 3000)
                        }
                        })

                        cy.nodes().on('mouseover', (evt) => {
                        const n = evt.target.data()
                        const sel = evt.target;
                        cy.elements().not(sel).addClass('semitransp');
                        sel.addClass('highlight').outgoers().addClass('colored')
                        sel.incomers().addClass('colored')
                        sel.incomers().removeClass('semitransp')
                        sel.outgoers().removeClass('semitransp')
                        if (n.id !== (node || {}).id) {
                            // setAnchorEl(evt.target.popperRef())
                            // setNode({node: n})
                            setNode(n)
                        }
                        });

                        cy.nodes().on('mouseout', (evt) => {
                        const sel = evt.target;
                        cy.elements().removeClass('semitransp');
                        sel.removeClass('highlight').outgoers().removeClass('colored')
                        sel.incomers().removeClass('colored')
                        // setAnchorEl(null)
                        // setNode({node: null})
                        setNode(null)
                        });
                        cy.edges().on('mouseover', (evt) => {
                        const n = evt.target.data()
                        const sel = evt.target;
                        cy.elements().not(sel).addClass('semitransp');
                        sel.addClass('colored').connectedNodes().addClass('highlight')
                        sel.connectedNodes().removeClass('semitransp')
                        if (n.id !== (node || {}).id) {
                            // setAnchorEl(evt.target.popperRef())
                            // setNode({node: n})
                            setNode(n)
                        }
                        });
                        cy.edges().on('mouseout', (evt) => {
                        const sel = evt.target;
                        cy.elements().removeClass('semitransp');
                        sel.removeClass('colored').connectedNodes().removeClass('highlight')
                        // setAnchorEl(null)
                        // setNode({node: null})
                        setNode(null)
                        });
                    }}
                    />
                }
                {(elements && userListId) && <Legend elements={elements} search={false} top={sm ? 2000: 550}/>}
                {(focused || node) && <TooltipCard 
                    node={focused || node}
                    schema={schema}
                    tooltip_templates={tooltip_templates} 
                    setFocused={setFocused}
                    router={router}
                    top={sm ? 1500: 550}
                    endpoint={`/${page}`}
                    />}
            </Grid>
            <Grid item xs={12}>
                <div ref={tableref}>
                    <NetworkTable data={elements} schema={schema}/>,
                </div>
            </Grid>
        </Grid>
    )
}

export default Enrichment