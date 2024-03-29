/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2023 Martin Grimme <martin.grimme@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*******************************************************************************/

shRequire([__dirname + "/listmodel.js"], lm =>
{

    const d = new WeakMap();

    /**
     * Class representing an adapter for treating a {@link core.ListModel} with
     * a role for the depth level as a tree with collapsible nodes.
     *
     * This adapter extends the original list items with a new role for the
     * status of the tree node. The status is an object with these properties:
     *
     *  * `collapsed`: Whether the node is currently collapsed.
     *  * `verticals`: A list of booleans telling for each depth level up to this node if there are vertical lines going past this node. This information can be used for rendering branch lines.
     *
     * A tree model may be used anywhere a list model is expected.
     * 
     * ### Dynamic Content
     * 
     * The list model can be populated dynamically when uncollapsing a node by defining the
     * `dynamicContentProvider` function. This function takes a tree node index and is
     * expected to return a Promise for a list of node items (`async` functions return
     * a Promise automatically).
     * 
     * ```
     * TreeModelAdapter {
     *     model: listModel
     *     dynamicContentProvider: async (idx) =>
     *     {
     *         const item = at(idx);
     *         const nodes = [];
     *         for (let i = 0; i < 10; ++i)
     *         {
     *             nodes.push({
     *                 name: "Item #" + (i + 1),
     *                 level: item.level + 1,
     *                 nodeType: "folder"
     *             });
     *         }
     *         return nodes;
     *     }
     * }
     * ```
     * 
     * The thus newly created node items are removed from the model automatically when collapsing an ancestor node.
     * 
     * @extends core.ListModel
     * @memberof core
     *
     * @property {string} levelRole - (default: `"level"`) The name of the role holding the depth level of a tree node.
     * @property {function} dynamicContentProvider - (default: `null`) If this function is defined, it will be used to fill the model with content dynamically when uncollapsing a node.
     * @property {string} statusRole - (default: `"nodeStatus"`) The name of the role to be used for the status of a tree node.
     * @property {core.ListModel} model - (default: null) The list model to work on.
     */
    class TreeModelAdapter extends lm.ListModel
    {
        constructor()
        {
            super();
            d.set(this, {
                levelRole: "level",
                statusRole: "nodeStatus",
                model: null,
                dynamicContentProvider: null,
                skipTrees: [],
                collapseMap: new Map(),
                toListIndexCache: new Map(),
                toTreeIndexCache: new Map(),
                nodesOfInfluence: [] // nodes of influence are the only nodes with influence on the status of other nodes
            });

            this.notifyable("dynamicContentProvider");
            this.notifyable("levelRole");
            this.notifyable("statusRole");
            this.notifyable("model");

            this.onDestruction = () =>
            {
                if (d.get(this).model)
                {
                    d.get(this).model.referenceRemove(this);
                }
            };
        }

        get levelRole() { return d.get(this).levelRole; }
        set levelRole(r)
        {
            d.get(this).levelRole = r;
            this.levelRoleChanged();
        }

        get dynamicContentProvider() { return d.get(this).dynamicContentProvider; }
        set dynamicContentProvider(p)
        {
            d.get(this).dynamicContentProvider = p;
            this.dynamicContentProviderChanged();
        }

        get statusRole() { return d.get(this).statusRole; }
        set statusRole(r)
        {
            d.get(this).statusRole = r;
            this.statusRoleChanged();
        }

        get model() {return d.get(this).model; }
        set model(m)
        {
            const priv = d.get(this);

            if (priv.model)
            {
                // stop watching previous model
                priv.model.disconnect("modelReset", this);
                priv.model.disconnect("modelInsert", this);
                priv.model.disconnect("modelRemove", this);
                priv.model.disconnect("modelReplace", this);
                priv.model.referenceRemove(this);
            }

            priv.model = m;
            if (m)
            {
                m.referenceAdd(this);
                
                m.connect("modelReset", this, () =>
                {
                    priv.collapseMap.clear();
                    this.updateNodeMaps();
                    this.modelReset();
                    this.sizeChanged();
                });

                m.connect("modelInsert", this, (at, size) =>
                {
                    // shift entries in collapse map
                    const collapseKeys = [...priv.collapseMap.keys()]
                    .filter(idx => idx >= at)
                    .sort((a, b) => b - a /* reverse */);
                    collapseKeys.forEach(idx =>
                    {
                        const collapsed = priv.collapseMap.get(idx);
                        priv.collapseMap.set(idx + size, collapsed);
                        priv.collapseMap.delete(idx);
                    });

                    this.updateNodeMaps();
                    
                    // find the ranges of insertions and propagate those
                    const insertionRanges = [];
                    let rangeBegin = -1;
                    let rangeEnd = -1;
                    for (let i = at; i < at + size; ++i)
                    {
                        const treeIndex = this.toTreeIndex(i);
                        if (treeIndex  !== -1)
                        {
                            //visible
                            if (rangeBegin === -1)
                            {
                                rangeBegin = i;
                            }
                            rangeEnd = i;
                        }
                        else
                        {
                            // invisible
                            if (rangeEnd !== -1)
                            {
                                insertionRanges.push([rangeBegin, rangeEnd]);
                                rangeBegin = -1;
                                rangeEnd = -1;
                            }
                        }
                    }
                    insertionRanges.forEach(range =>
                    {
                        const [ rangeBegin, rangeEnd ] = range;
                        this.modelInsert(rangeBegin, rangeEnd - rangeBegin + 1);
                    });

                    this.sizeChanged();
                });

                m.connect("modelRemove", this, at =>
                {
                    // shift entries in collapse map
                    priv.collapseMap.delete(at);
                    const collapseKeys = [...priv.collapseMap.keys()]
                    .filter(idx => idx > at)
                    .sort((a, b) => a - b);
                    collapseKeys.forEach(idx =>
                    {
                        const collapsed = priv.collapseMap.get(idx);
                        priv.collapseMap.set(idx - 1, collapsed);
                        priv.collapseMap.delete(idx);
                    });

                    const treeIdx = this.toTreeIndex(at);
                    this.updateNodeMaps();
                    
                    if (treeIdx !== -1)
                    {
                        //console.log("ON REMOVE " + at + " -> " + treeIdx);
                        // check if we removed the last node of a subtree
                        if (at > 0)
                        {
                            const prevTreeIdx = this.toTreeIndex(at - 1);
                            
                            if (prevTreeIdx !== -1)
                            {
                                //console.log("TEST LEVEL");
                                const prevLevel = priv.model.at(at - 1)[priv.levelRole];
                                const level = at >= priv.model.size ? prevLevel
                                                                    : priv.model.at(at)[priv.levelRole];
                                //console.log(prevLevel + ", " + level);
                                
                                if (prevLevel >= level)
                                {
                                    //console.log("PREV NODE BECAME A LEAF");
                                    this.modelReplace(this.toTreeIndex(at - 1));
                                }
                            }
                        }
    
                        this.modelRemove(treeIdx);
                        this.sizeChanged();
                    }
                });

                m.connect("modelReplace", this, at =>
                {
                    // check if the collapsed status changed
                    const treeIdx = this.toTreeIndex(at);
                    //console.log("REPLACE " + at + " -> " + treeIdx);
                    if (treeIdx === -1)
                    {
                        return;
                    }

                    const isCollapsed = this.isCollapsed(at);
                    // nodes without children are considered collapsed always
                    const wasCollapsed = at < m.size - 1 && m.at(at + 1)[priv.levelRole] > m.at(at)[priv.levelRole]
                                         ? this.toTreeIndex(at + 1) === -1
                                         : true;
                    //console.log("isCollapsed " + isCollapsed + " wasCollapsed " + wasCollapsed);

                    if (! isCollapsed && wasCollapsed)
                    {
                        // uncollapse:
                        // - map tree index of next node to list index
                        // - update skip sections
                        // - map list index to new tree index
                        // - insert what's inbetween
                        const treeIdx = this.toTreeIndex(at);
                        const nextListIdx = this.toListIndex(treeIdx + 1);
                        this.updateNodeMaps();
                        const newNextTreeIdx = this.toTreeIndex(nextListIdx);
                        this.modelReplace(treeIdx);
                        this.modelInsert(treeIdx + 1, newNextTreeIdx - (treeIdx + 1));
                        this.sizeChanged();
                    }
                    else if (isCollapsed && ! wasCollapsed)
                    {
                        // collapse:
                        // - get tree index of node
                        // - update skip sections
                        // - map tree index of next tree node to list index
                        // - remove the difference
                        const treeIdx = this.toTreeIndex(at);
                        this.updateNodeMaps();
                        const nextListIdx = this.toListIndex(treeIdx + 1);
                        this.modelReplace(treeIdx);
                        for (let i = nextListIdx; i > at; --i)
                        {
                            this.modelRemove(treeIdx + 1);
                        }
                        this.sizeChanged();
                    }
                    else
                    {
                        // a simple replace
                        this.modelReplace(this.toTreeIndex(at));
                    }
                });
                this.updateNodeMaps();
            }
        }

        get size()
        {
            const priv = d.get(this);
            let skippedAmount = 0;

            priv.skipTrees.forEach(skipTree =>
            {
                const skipWidth = skipTree[1] - skipTree[0] + 1 /* end-inclusive */;
                skippedAmount += skipWidth;
            });

            return priv.model.size - skippedAmount;
        }

        /**
         * Sets the collapsion state of a tree node.
         * 
         * @param {number} n - The tree index of the node.
         * @param {bool} value - Whether the node shall be collapsed.
         */
        setCollapsed(n, value)
        {
            const priv = d.get(this);

            const listIdx = this.toListIndex(n);
            const item = this.model.at(listIdx);

            if (priv.dynamicContentProvider)
            {
                if (value)
                {
                    // collapse
                    const s = priv.model.size;
                    for (let i = n + 1; i < s; ++i)
                    {
                        if (this.at(n + 1).level <= item.level)
                        {
                            break;
                        }
                        this.remove(n + 1);
                    }
                }
                else
                {
                    // uncollapse
                    priv.dynamicContentProvider(n)
                    .then(nodes =>
                    {
                        if (nodes.length === 0)
                        {
                            return;
                        }

                        this.bulkInsert(n + 1, nodes);

                        priv.collapseMap.set(listIdx, false);
                        priv.model.replace(listIdx, item);
                    })
                    .catch(err => console.error(err));
                    return;
                }
            }

            priv.collapseMap.set(listIdx, value);
            priv.model.replace(listIdx, item);
        }

        isCollapsed(listIdx)
        {
            const collapsed = d.get(this).collapseMap.get(listIdx);
            return collapsed !== undefined ? collapsed : true;
        }

        visibleNodes()
        {
            const priv = d.get(this);
            const visibles = [];

            let pos = 0;
            priv.skipTrees.forEach(item =>
            {
                for (let i = pos; i < item[0]; ++i)
                {
                    visibles.push(i);
                }
                pos = item[1] + 1;
            });
            for (let i = pos; i < priv.model.size; ++i)
            {
                visibles.push(i);
            }

            return visibles;
        }

        hasMoreOnLevel(n, level)
        {
            const priv = d.get(this);

            // we only have to look at the nodes of influence
            const noi = priv.nodesOfInfluence.filter(idx => idx > n);
            for (let i = 0; i < noi.length; ++i)
            {
                const nodeLevel = priv.model.at(noi[i])[priv.levelRole];
                if (nodeLevel < level)
                {
                    return false;
                }
                else if (nodeLevel === level)
                {
                    return true;
                }
            }
            return false;
        }

        updateNodeMaps()
        {
            const priv = d.get(this);

            priv.toListIndexCache.clear();
            priv.toTreeIndexCache.clear();
            priv.skipTrees = this.makeSkipTrees(0, priv.model.size - 1);
            //console.log("Skip Trees: " + JSON.stringify(priv.skipTrees));

            // get the nodes of influence
            priv.nodesOfInfluence = this.makeNodesOfInfluence();
            //console.log("Nodes of Influence: " + JSON.stringify(priv.nodesOfInfluence));
        }

        makeSkipTrees(from, to)
        {
            const priv = d.get(this);
            const newTrees = [];

            let collapseLevel = 0;
            let inCollapse = false;
            let skipBegin = 0;
            let skipEnd = 0;

            for (let i = from; i <= to; ++i)
            {
                const item = priv.model.at(i);
                const level = item[priv.levelRole];
                const collapsed = this.isCollapsed(i);
                //console.log("COLLAPSED: " + i + " " + collapsed);

                if (inCollapse && level >= collapseLevel)
                {

                }
                else if (inCollapse)
                {
                    skipEnd = i - 1;
                    if (skipEnd >= skipBegin)
                    {
                        newTrees.push([skipBegin, skipEnd, this.makeSkipTrees(skipBegin, skipEnd)]);
                    }
                    inCollapse = false;
                }
                
                if (! inCollapse && collapsed)
                {
                    skipBegin = i + 1;
                    collapseLevel = level + 1;
                    inCollapse = true;
                }
                else if (! inCollapse)
                {

                }
            }

            if (inCollapse)
            {
                skipEnd = to;
                if (skipEnd >= skipBegin)
                {
                    newTrees.push([skipBegin, skipEnd, this.makeSkipTrees(skipBegin, skipEnd)]);
                }
            }

            return newTrees;
        }

        makeNodesOfInfluence()
        {
            const priv = d.get(this);

            const nodesOfInfluence = [];
            let prevLevel = -1;
            let prevIdx = -1;
            let prevNodeOfInfluence = -1;
            const visibleNodes = this.visibleNodes();

            visibleNodes.forEach(idx =>
            {
                const item = priv.model.at(idx);
                const level = item[priv.levelRole];
                if (level !== prevLevel)
                {
                    if (prevIdx !== -1 && prevIdx !== prevNodeOfInfluence)
                    {
                        nodesOfInfluence.push(prevIdx);
                    }
                    nodesOfInfluence.push(idx);
                    prevNodeOfInfluence = idx;
                }
                prevLevel = level;
                prevIdx = idx;
            });

            // the last node is of interest, too
            if (prevNodeOfInfluence !== visibleNodes[visibleNodes.length - 1])
            {
                nodesOfInfluence.push(visibleNodes[visibleNodes.length - 1]);
            }

            return nodesOfInfluence;
        }

        /**
         * Converts a tree index to a list index of the underlying list model.
         * 
         * @param {number} n - The tree index.
         * @returns {number} - The list index.
         */
        toListIndex(n)
        {
            const priv = d.get(this);

            const fromCache = priv.toListIndexCache.get(n);
            if (fromCache !== undefined)
            {
                return fromCache;
            }

            let pointAt = 0;
            let remaining = n;
           
            for (let i = 0; i < priv.skipTrees.length; ++i)
            {
                const skipTree = priv.skipTrees[i];
                const skipBegin = skipTree[0];
                const skipEnd = skipTree[1];

                if (pointAt + remaining < skipBegin)
                {
                    // found it
                    priv.toListIndexCache.set(n, pointAt + remaining);
                    return pointAt + remaining;
                }
                else
                {
                    // skip section and continue
                    remaining -= (skipBegin - pointAt);
                    pointAt = skipEnd + 1;
                }
            }

            // reached end of skip sections
            priv.toListIndexCache.set(n, pointAt + remaining);
            return pointAt + remaining;
        }

        /**
         * Converts a list index of the underlying list model to a tree index.
         * If the list item is currently not visible in the tree due to a collapsed ancestor,
         * `-1` will be returned instead.
         * 
         * @param {number} n - The list index.
         * @returns {number} - The tree index, or `-1` if the list item is not visible in the tree.
         */
        toTreeIndex(n)
        {
            const priv = d.get(this);

            const fromCache = priv.toTreeIndexCache.get(n);
            if (fromCache !== undefined)
            {
                return fromCache;
            }

            let skipAmount = 0;

            for (let i = 0; i < priv.skipTrees.length; ++i)
            {
                const skipTree = priv.skipTrees[i];
                const skipBegin = skipTree[0];
                const skipEnd = skipTree[1];

                if (n < skipBegin)
                {
                    // found it
                    priv.toTreeIndexCache.set(n, n - skipAmount);
                    return n - skipAmount;
                }
                else if (n <= skipEnd)
                {
                    // not visible
                    priv.toTreeIndexCache.set(n, -1);
                    return -1;
                }
                else
                {
                    skipAmount += (skipEnd - skipBegin + 1);
                }
            }
            
            // reached end of skip sections
            priv.toTreeIndexCache.set(n, n - skipAmount);
            return n - skipAmount;
        }

        replace(at, item)
        {
            const listIndex = this.toListIndex(at);
            d.get(this).model.replace(listIndex, item);
        }

        insert(at, data)
        {
            const priv = d.get(this);
            
            let listIdx = 0;
            if (at < this.size)
            {
                listIdx = this.toListIndex(at);
            }
            else
            {
                listIdx = priv.model.size;
            }
            priv.model.insert(listIdx, data);
        }

        bulkInsert(at, bulk)
        {
            const listIdx = this.toListIndex(at);
            d.get(this).model.bulkInsert(listIdx, bulk);
        }

        remove(at)
        {
            const priv = d.get(this);
            const listIdx = this.toListIndex(at);
            const item = priv.model.at(listIdx);
            const level = item[priv.levelRole];

            if (this.hasMoreOnLevel(listIdx, level))
            {
                priv.model.remove(listIdx);
            }
            else
            {
                //console.log("was last on level " + level + ": " + at);
                priv.model.remove(listIdx);
                for (let i = at - 1; i >= 0; --i)
                {
                    const prevItem = this.at(i);
                    this.modelReplace(i);

                    if (prevItem[priv.levelRole] <= level)
                    {
                        break;
                    }
                }
            }
        }

        at(n)
        {
            const priv = d.get(this);

            const listIdx = this.toListIndex(n);
            const item = priv.model.at(listIdx);
            if (! item)
            {
                return null;
            }
            const obj = Object.create(item);

            const verticals = [];
            const level = item[priv.levelRole];
            for (let i = 1; i <= level; ++i)
            {
                if (i === level)
                {
                    verticals.push(this.hasMoreOnLevel(listIdx, i) ? 2 : 1);
                }
                else
                {
                    //verticals.push(2);
                    verticals.push(this.hasMoreOnLevel(listIdx, i) ? 2 : 0);
                }
            }

            obj[priv.statusRole] = {
                collapsed: this.isCollapsed(listIdx),
                verticals
            };
            return obj;
        }

    }
    exports.TreeModelAdapter = TreeModelAdapter;

});