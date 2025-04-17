<script lang="ts">
    import { onDestroy, onMount } from "svelte"; // Svelte 生命周期钩子 (组件挂载/销毁时触发)
    import { sql as query, removeDoc } from "@/api"; // 自定义 API 模块 (版本查询和 SQL 执行接口)
    import { showMessage, Protyle, I18N } from "siyuan"; // 思源笔记官方 API (消息提示、POST 请求、编辑器组件)

    interface DocItem {
        id: string;
        name: string;
        notebook: string;
        path: string;
    }

    export let app;
    export let i18n: I18N;

    let divProtyle: HTMLDivElement;
    let protyle: any;
    let blockID: string = "";
    let emptydocs: DocItem[] = [];
    $: console.log(emptydocs);
    let selectedDoc: DocItem | null = null;
    let selectedIds: string[] = [];
    let showConfirmDialog = false;
    let deleteCount = 0;

    onMount(async () => {
        protyle = await initProtyle(); // 初始化编辑器
        await findEmptyDocuments();
    });

    onDestroy(() => {
        protyle.destroy(); // 销毁编辑器实例
    });

    async function findEmptyDocuments() {
        try {
            const findSQL = `
            SELECT parent.id AS id,
                   parent.content AS content,
                   parent.box AS box,
                   parent.path AS path
            FROM blocks AS parent
            LEFT JOIN blocks AS child 
                ON parent.id = child.parent_id
                AND child.type = 'p'
            WHERE parent.type = 'd'
            AND NOT EXISTS (
                SELECT 1 
                FROM blocks AS other_child 
                WHERE other_child.parent_id = parent.id 
                AND other_child.type != 'p'
            )
            AND NOT EXISTS (
                SELECT 1 
                FROM blocks AS child_doc 
                WHERE child_doc.path LIKE 
                    SUBSTR(parent.path, 1, LENGTH(parent.path) - 3) || '/%'
                AND child_doc.type = 'd'
            )
            GROUP BY parent.id
            HAVING (
                COUNT(child.id) = 0 OR (
                    COUNT(child.id) = 1 
                    AND TRIM(COALESCE(MAX(child.content), '')) = ''
                )
            )
            LIMIT 100000000
        `;

            const alldocs = await query(findSQL);
            if (alldocs.length > 0) {
                emptydocs = alldocs.map((doc) => ({
                    id: doc.id,
                    name: doc.content,
                    notebook: doc.box,
                    path: doc.path,
                }));
            }
        } catch (error) {
            showMessage(`${i18n.findError} ${error.message}`, 5000, "error");
        }
    }

    async function handleDocClick(doc: DocItem) {
        selectedDoc = doc;

        // 销毁旧编辑器
        if (protyle) {
            protyle.destroy();
        }

        // 重新初始化编辑器
        protyle = new Protyle(app, divProtyle, {
            blockId: doc.id,
            render: {
                background: false,
                title: false,
                gutter: true,
            },
        });
    }

    async function deleteSelectedDocs() {
        try {
            const docsToDelete = emptydocs.filter((doc) =>
                selectedIds.includes(doc.id),
            );

            await Promise.all(
                docsToDelete.map(async (doc) => {
                    await removeDoc(doc.notebook, doc.path);
                }),
            );

            showMessage(
                `${i18n.deleteSuccess1} ${selectedIds.length} ${i18n.deleteSuccess2}`,
                5000,
                "info",
            );
            emptydocs = emptydocs.filter(
                (doc) => !selectedIds.includes(doc.id),
            );
            selectedIds = [];
        } catch (error) {
            showMessage(`${i18n.deleteError} ${error.message}`, 5000, "error");
        }
    }

    // 初始化 Protyle 编辑器
    async function initProtyle() {
        return new Protyle(app, divProtyle, {
            // 创建编辑器实例
            blockId: blockID,
        });
    }
</script>

<div class="b3-dialog__content">
    <div class="flex-container">
        <span
            >{i18n.EmptyDocNumber1}{emptydocs.length}{i18n.EmptyDocNumber2}</span
        >
        <div style="margin-left: auto; display: flex; gap: 8px;">
            {#if emptydocs.length > 0}
                <button
                    class="b3-button b3-button--outline"
                    on:click={() => {
                        selectedIds =
                            selectedIds.length === emptydocs.length
                                ? []
                                : emptydocs.map((d) => d.id);
                    }}
                >
                    {selectedIds.length === emptydocs.length
                        ? i18n.cancelSelectAll
                        : i18n.selectAll}
                </button>
            {/if}
            <button
                class="b3-button b3-button--outline"
                on:click={() => {
                    if (selectedIds.length === 0) return;
                    deleteCount = selectedIds.length;
                    showConfirmDialog = true;
                }}
            >
                <svg class="b3-button__icon"
                    ><use xlink:href="#iconTrashcan"></use></svg
                >
                {i18n.deleteButton}
            </button>
        </div>
    </div>
    <div class="fn__hr" />
    <div class="doc-list">
        {#each emptydocs as doc}
            <div class="doc-item">
                <input
                    type="checkbox"
                    checked={selectedIds.includes(doc.id)}
                    on:change={() => {
                        selectedIds = selectedIds.includes(doc.id)
                            ? selectedIds.filter((id) => id !== doc.id)
                            : [...selectedIds, doc.id];
                    }}
                />
                <button
                    type="button"
                    on:click={() => handleDocClick(doc)}
                    class="doc-content"
                >
                    📄 {doc.name}
                </button>
            </div>
        {:else}
            <div class="empty-tip">{i18n.sussess}</div>
        {/each}
    </div>
    <div class="fn__hr" />
    <div>
        {#if selectedDoc}
            {selectedDoc.name} (ID: {selectedDoc.id})
        {:else}
            {i18n.clickToView}
        {/if}
    </div>
    <div class="fn__hr" />
    <div id="protyle" style="height: 360px;" bind:this={divProtyle} />
</div>

{#if showConfirmDialog}
    <div class="b3-dialog-container" style="z-index: 9999;">
        <div
            class="b3-dialog-scrim"
            role="button"
            tabindex="0"
            on:click|self={() => (showConfirmDialog = false)}
            on:keydown={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                (showConfirmDialog = false)}
        ></div>
        <div class="b3-dialog-card">
            <div class="b3-dialog__header" role="heading" aria-level="2">
                <svg class="b3-dialog__icon" aria-hidden="true">
                    <use xlink:href="#iconTrashcan" />
                </svg>
                <h2 class="b3-dialog__title">{i18n.confirmDelete}</h2>
            </div>
            <div class="b3-dialog__body">
                {i18n.deleteConfirm1}
                {deleteCount}
                {i18n.deleteConfirm2}<span class="warning-text"
                    >{i18n.irreversible}</span
                >
            </div>
            <div class="b3-dialog__footer">
                <button
                    class="b3-button b3-button--text"
                    on:click={() => {
                        deleteSelectedDocs();
                        showConfirmDialog = false; // 添加关闭对话框操作
                    }}>{i18n.ensureDelete}</button
                >
                <button
                    class="b3-button"
                    on:click={() => (showConfirmDialog = false)}
                    >{i18n.cancelButton}</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    .flex-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .b3-button--outline {
        font-weight: 700 !important;
    }

    .doc-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 8px;
        margin: 8px 0;
        max-height: 300px;
        overflow-y: auto;
    }

    .doc-item {
        padding: 8px 12px;
        background-color: var(--b3-theme-background-light);
        border-radius: var(--b3-border-radius);
        word-break: break-word;
        line-height: 1.5;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .doc-content {
        flex: 1;
        text-align: left;
        background: none;
        border: none;
        cursor: pointer;
    }

    input[type="checkbox"] {
        width: 16px;
        height: 16px;
    }

    .b3-dialog-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        pointer-events: none;
    }

    .b3-dialog-scrim {
        background-color: var(--b3-theme-scrim);
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: auto;
    }

    .b3-dialog-card {
        background: var(--b3-theme-surface);
        border-radius: var(--b3-border-radius-dialog);
        width: 400px;
        max-width: 90vw;
        box-shadow: var(--b3-dialog-shadow);
        pointer-events: auto;
        z-index: 1;
        animation: dialog-enter 0.2s ease;
    }

    @keyframes dialog-enter {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .b3-dialog__header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 26px; /* 控制最小高度 */
        padding: 12px 16px; /* 精简内边距 */
        padding-top: 8px;
        padding-bottom: 8px;
    }

    .b3-dialog__title {
        font-size: 1em; /* 从默认1.5em下调 */
        margin: 0; /* 清除h2默认margin */
        line-height: 1.2;
    }

    .b3-dialog__icon {
        width: 18px; /* 图标尺寸优化 */
        height: 18px;
    }

    .b3-dialog__body {
        min-height: 60px; /* 最小高度保障 */
        padding: 16px 24px; /* 增加内边距 */
        font-size: 0.95em;
        line-height: 1.6; /* 优化行高 */
        color: var(--b3-theme-on-background); /* 使用主题色 */
        font-weight: 500;
        display: flex;
        align-items: center; /* 垂直居中 */
        justify-content: center; /* 水平居中 */
        text-align: center; /* 文字居中 */
    }

    .warning-text {
        color: var(--b3-theme-error); /* 使用错误提示色 */
        font-weight: 600;
        margin-left: 4px;
    }

    .b3-dialog__footer {
        display: flex;
        justify-content: flex-end; /* 按钮靠右 */
        gap: 12px; /* 按钮间距 */
        padding: 16px;
        border-top: 1px solid var(--b3-theme-divider);
    }

    /* 响应式适配 */
    @media (max-width: 480px) {
        .b3-dialog__footer {
            flex-wrap: wrap;
            justify-content: stretch;
        }
        .b3-dialog__footer button {
            flex: 1; /* 小屏幕时按钮撑满容器 */
        }
    }

    /* 悬停动效增强 */
    .b3-button {
        transition: transform 0.2s ease;
    }
    .b3-button:hover {
        transform: translateY(-1px);
    }
</style>
