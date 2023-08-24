shRequire([__dirname + "/listmodel.js"], lm =>
{

    const d = new WeakMap();

    /**
     * Class representing an adapter for treating a {@link core.ListModel} as
     * a tree.
     * 
     * @extends core.ListModel
     * @memberof core
     * 
     * @property {string} levelRole - (default: `"level"`) The name of the role holding the depth level of a tree node.
     * @property {core.ListModel} model - (default: null) The list model to work on.
     */
    class TreeModelAdapter extends lm.ListModel
    {
        constructor()
        {
            super();
            d.set(this, {
                levelRole: "level",
                model: null,
                skipTrees: [],
                collapseMap: new Map(),
                toListIndexCache: new Map(),
                toTreeIndexCache: new Map()
            });

            this.notifyable("levelRole");
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
                    this.updateSkipTrees();
                    this.modelReset();
                    this.sizeChanged();
                });

                m.connect("modelInsert", this, (at, size) =>
                {
                    this.updateSkipTrees();
                    
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
                    const treeIdx = this.toTreeIndex(at);
                    this.updateSkipTrees();
                    
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
                    const wasCollapsed = this.toTreeIndex(at + 1) === -1;
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
                        this.updateSkipTrees();
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
                        this.updateSkipTrees();
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
                this.updateSkipTrees();
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

        setCollapsed(n, value)
        {
            const priv = d.get(this);

            const listIdx = this.toListIndex(n);
            priv.collapseMap.set(listIdx, value);

            const item = this.model.at(listIdx);
            priv.model.replace(listIdx, item);
        }

        isCollapsed(listIdx)
        {
            const collapsed = d.get(this).collapseMap.get(listIdx);
            return collapsed !== undefined ? collapsed : true;
        }

        isLeaf(n)
        {
            const priv = d.get(this);

            const listIndex = this.toListIndex(n);
            const item = priv.model.at(listIndex);
            if (listIndex < priv.model.size - 1)
            {
                const nextItem = priv.model.at(listIndex + 1);
                return nextItem[priv.levelRole] <= item[priv.levelRole];
            }
            else
            {
                return true;
            }
        }

        isLastChild(n)
        {
            const priv = d.get(this);

            const listIndex = this.toListIndex(n);
            const item = priv.model.at(listIndex);
            return ! this.hasMoreOnLevel(n, item[priv.levelRole]);
        }

        hasMoreOnLevel(n, level)
        {
            const priv = d.get(this);

            for (let i = n + 1; i < this.size; ++i)
            {
                const nodeLevel = this.at(i)[priv.levelRole];
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

        updateSkipTrees()
        {
            d.get(this).toListIndexCache.clear();
            d.get(this).toTreeIndexCache.clear();
            d.get(this).skipTrees = this.makeSkipTrees(0, d.get(this).model.size - 1);
            //console.log(JSON.stringify(d.get(this).skipTrees));
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

            if (this.hasMoreOnLevel(at, level))
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
            const obj = Object.create(item);
            obj.nodeStatus = {
                collapsed: this.isCollapsed(n),
                hasNextSibling: this.hasMoreOnLevel(n, item.level)
            };
            return obj;
        }

    }
    exports.TreeModelAdapter = TreeModelAdapter;

});