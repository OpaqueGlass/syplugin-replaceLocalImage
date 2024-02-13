/*
  Copyright (C) 2023 OpaqueGlass

  This program is released under the AGPLv3 license.
  For details, see:
  - License Text: https://www.gnu.org/licenses/agpl-3.0.html
  - License Summary: https://tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)

  THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN 
  OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM 
  "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, 
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK
  AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, 
  YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

  IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING WILL ANY COPYRIGHT HOLDER, 
  OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU 
  FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF 
  THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF DATA OR DATA BEING
  RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO
  OPERATE WITH ANY OTHER PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE
  POSSIBILITY OF SUCH DAMAGES.

*/

const siyuan = require('siyuan');

/**
 * 全局变量
 */
let g_switchTabObserver; // 页签切换与新建监视器
let g_windowObserver; // 窗口监视器
const CONSTANTS = {
    STYLE_ID: "og-file-tree-enhance-plugin-style",
    ICON_ALL: 2,
    ICON_NONE: 0,
    ICON_CUSTOM_ONLY: 1,
    PLUGIN_NAME: "og_hierachy_navigate",
    SAVE_TIMEOUT: 900,
    POP_NONE: 0,
    POP_LIMIT: 1,
    POP_ALL: 2,
}
let g_writeStorage;
let g_isMobile = false;
let g_mutex = 0;
let g_app;
let g_isRecentClicked = false; // 判定是否近期点击过文档树
let g_recentClickedId = null;
let g_recentClickCheckTimeout = null; // 等待重新判定timeout
let g_delayTimeMs = 300; // 判定延迟300ms
let g_setting = {
    dblclickShowSubDoc: null,
    dblclickDelay: null,
    disableChangeIcon: null,
};
let g_setting_default = {
    dblclickShowSubDoc: true,
    dblclickDelay: 200,
    disableChangeIcon: true,
};
/**
 * Plugin类
 */
class DoubleClickFileTreePlugin extends siyuan.Plugin {

    tabOpenObserver =  null;

    onload() {
        g_isMobile = isMobile();
        language = this.i18n;
        language["name"] = this.name;
        g_app = this.app;
        // 读取配置
        // TODO: 读取配置API变更
        Object.assign(g_setting, g_setting_default);

        g_writeStorage = this.saveData;
        this.addIcons(`<symbol id="iconBookImage" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><circle cx="10" cy="8" r="2"/><path d="m20 13.7-2.1-2.1c-.8-.8-2-.8-2.8 0L9.7 17"/>
</symbol>`);

`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-image"></svg>`

        const topBarElement = this.addTopBar({
            icon: "iconBookImage",
            title: this.i18n.btn_replaceImageURL,
            position: "right",
            callback: () => {
                main();
            }
        });
        
        logPush('FileTreeEnhancePluginInited');
    }
    onLayoutReady() {
        this.loadData("settings.json").then((settingCache)=>{
            // 解析并载入配置
            try {
                // let settingData = JSON.parse(settingCache);
                Object.assign(g_setting, settingCache);
                this.eventBusInnerHandler(); 
            }catch(e){
                warnPush("DBT载入配置时发生错误",e);
            }
            // if (!initRetry()) {
            //     setInterval(initRetry, 3000);
            // }
        }, (e)=> {
            debugPush("配置文件读入失败", e);
        });
    }

    onunload() {
        this.el && this.el.remove();
        removeStyle();

        // 善后
    }
    // TODO: 重写载入设置
    /*
    openSetting() {
        // 生成Dialog内容

        // 创建dialog
        const settingDialog = new siyuan.Dialog({
            "title": language["setting_panel_title"],
            "content": `
            <div class="b3-dialog__content" style="flex: 1;">
                <div id="${CONSTANTS.PLUGIN_NAME}-form-content" style="overflow: auto;"></div>
            </div>
            <div class="b3-dialog__action" id="${CONSTANTS.PLUGIN_NAME}-form-action" style="max-height: 40px">
                <button class="b3-button b3-button--cancel">${language["button_cancel"]}</button><div class="fn__space"></div>
                <button class="b3-button b3-button--text">${language["button_save"]}</button>
            </div>
            `,
            "width": isMobile() ? "92vw":"1040px",
            "height": isMobile() ? "50vw":"80vh",
        });
        // console.log("dialog", settingDialog);
        const actionButtons = settingDialog.element.querySelectorAll(`#${CONSTANTS.PLUGIN_NAME}-form-action button`);
        actionButtons[0].addEventListener("click",()=>{settingDialog.destroy()}),
        actionButtons[1].addEventListener("click",()=>{
            // this.writeStorage('hello.txt', 'world' + Math.random().toFixed(2));
            debugPush('SAVING');
            let uiSettings = loadUISettings(settingForm);
            // clearTimeout(g_saveTimeout);
            // g_saveTimeout = setTimeout(()=>{
            this.saveData(`settings.json`, JSON.stringify(uiSettings));
            Object.assign(g_setting, uiSettings);
            removeStyle();
            setStyle();
            try {
                this.eventBusInnerHandler(); 
            }catch(err){
                console.error("og eventBusError", err);
            }
            debugPush("SAVED");
            settingDialog.destroy();
            // }, CONSTANTS.SAVE_TIMEOUT);
        });
        // 绑定dialog和移除操作

        // 生成配置页面
        const hello = document.createElement('div');
        const settingForm = document.createElement("form");
        settingForm.setAttribute("name", CONSTANTS.PLUGIN_NAME);
        settingForm.innerHTML = generateSettingPanelHTML([
            // 基础设定
            // new SettingProperty("dblclickShowSubDoc", "SWITCH", null),
            // new SettingProperty("dblclickDelay", "NUMBER", [50, 1200]),
            // new SettingProperty("disableChangeIcon", "SWITCH", null),
        ]);

        hello.appendChild(settingForm);
        settingDialog.element.querySelector(`#${CONSTANTS.PLUGIN_NAME}-form-content`).appendChild(hello);
    }
    */

    eventBusInnerHandler() {

    }
}



// debug push
let g_DEBUG = 2;
const g_NAME = "replaceImage";
const g_FULLNAME = "替换图床链接";

/*
LEVEL 0 忽略所有
LEVEL 1 仅Error
LEVEL 2 Err + Warn
LEVEL 3 Err + Warn + Info
LEVEL 4 Err + Warn + Info + Log
LEVEL 5 Err + Warn + Info + Log + Debug
*/
function commonPushCheck() {
    if (window.top["OpaqueGlassDebugV2"] == undefined || window.top["OpaqueGlassDebugV2"][g_NAME] == undefined) {
        return g_DEBUG;
    }
    return window.top["OpaqueGlassDebugV2"][g_NAME];
}

function isDebugMode() {
    return commonPushCheck() > g_DEBUG;
}

function debugPush(str, ...args) {
    if (commonPushCheck() >= 5) {
        console.debug(`${g_FULLNAME}[D] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

function logPush(str, ...args) {
    if (commonPushCheck() >= 4) {
        console.log(`${g_FULLNAME}[L] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

function errorPush(str, ... args) {
    if (commonPushCheck() >= 1) {
        console.error(`${g_FULLNAME}[E] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

function warnPush(str, ... args) {
    if (commonPushCheck() >= 2) {
        console.warn(`${g_FULLNAME}[W] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

class SettingProperty {
    id;
    simpId;
    name;
    desp;
    type;
    limit;
    value;
    /**
     * 设置属性对象
     * @param {*} id 唯一定位id
     * @param {*} type 设置项类型
     * @param {*} limit 限制
     */
    constructor(id, type, limit, value = undefined) {
        this.id = `${CONSTANTS.PLUGIN_NAME}_${id}`;
        this.simpId = id;
        this.name = language[`setting_${id}_name`];
        this.desp = language[`setting_${id}_desp`];
        this.type = type;
        this.limit = limit;
        if (value) {
            this.value = value;
        }else{
            this.value = g_setting[this.simpId];
        }
    }
}

async function main() {
    // 获取当前文档id
    let thisDocId = await getCurrentDocIdF();
    // 获取文档信息
    let docInfo = await getDocInfo(thisDocId);
    debugPush("docInfo", docInfo);
    // 分析是否包括picgo给出的图库信息
    if (!isValidStr(docInfo)) {
        logPush("没有找到对应的文档信息", thisDocId);
        return;
    }
    let picgoAttrs = undefined;
    if (docInfo.ial["custom-picgo-file-map-key"] != undefined) {
        picgoAttrs = JSON.parse(docInfo.ial["custom-picgo-file-map-key"]);
    } else {
        siyuan.showMessage(`[${language["name"]}] ${language["error_noPicgoAttr"]}`);
        return;
    }
    debugPush("picgo插件Attr", picgoAttrs);
    siyuan.confirm(`⚠️${language.confirm_replace.replace("${docInfo}", docInfo.name)}`, language.confirm_replaceDetail, () => {
        scanWorker(picgoAttrs, thisDocId);
    });

    // 给出警告，询问是否需要重复一下文档防止替换过程中错误
    // 最好是重复之后再重复的文档执行替换，这里可能会改成提示
    // 呃，算了，这里只提示错误信息吧

    // 前往数据库查找对应块
    // scanWorker(picgoAttrs, thisDocId);
    // 分析文档链接是否有效

    // 替换期间应当弹窗一下，防止出错


}

function confirmAsync(title, message) {
    return new Promise((resolve, reject) => {
        siyuan.confirm(title, message, () => {
            resolve(true);
        }, () => {
            resolve(false);
        });
    });
}

/**
 * 扫描并执行
 * @param {*} picgoAttrs 全部PicoAttr中保存的上传图片参数
 * @param {*} docId 正在上传的图片所在的文档id
 */
async function scanWorker(picgoAttrs, docId) {
    // 获取文档中本地图片
    const infoResult = await getAllAssetsBlockIdInDocId(docId);
    debugPush("扫描到的图片对应信息数组", infoResult);
    // 将assets所在的块写入这里，作为key存在，这样避免重复
    // if (infoResult.length == 0 && await confirmAsync("替换网络图片？", "没有在文档中找到本地图片，点击")) {
    //     debugPush("awaitResult", await confirmAsync("test", "test"));
    // }
    let blockIds = {};
    for (let oneInfoResult of infoResult) {
        blockIds[oneInfoResult.block_id] = true;
    }
    
    const promiseArray = new Array();
    for (let blockId of Object.keys(blockIds)) {
        promiseArray.push(replaceWorker(picgoAttrs, blockId));
        // result.assetsCount += oneReplaceResult.assetsCount;
        // result.replaceCount += oneReplaceResult.replaceCount;
    }
    Promise.all(promiseArray).then((results) => {
        let result = {
            "assetsCount": 0,
            "replaceCount": 0
        }
        for (let oneResult of results) {
            result.assetsCount += oneResult.assetsCount;
            result.replaceCount += oneResult.replaceCount;
        }
        
        let langKey = "success_replace";
        if (result.replaceCount == 0) {
            langKey = "fail_replace";
        } else if (result.replaceCount != result.assetsCount) {
            langKey = "success_partial_replace";
        }

        siyuan.showMessage(`[${language["name"]}] ${language[langKey].replace("${assetsCount}", result.assetsCount).replace("${replaceCount}", result.replaceCount)}`, 7000);
    });
}

/**
 * 
 * @param {*} picgoAttrs 全体PicGo插件参数
 * @param {*} blockId 执行替换的段落块id
 */
async function replaceWorker(picgoAttrs, blockId) {
    let result = {
        "assetsCount": 0,
        "replaceCount": 0,
    }
    // Kramdown文本
    let kramdownText = await getKramdown(blockId);
    debugPush("修改前Kramedown", kramdownText);
    
    // 正则表达式匹配
    const regex = /!\[([^\]]*)\]\(([^"'\)]+)(?:"([^"]*)")?\)/g;
    let match;
    let modifiedText = kramdownText;
    
    while ((match = regex.exec(kramdownText)) !== null) {
        const altText = match[1]; // 图片的标题
        const localPath = match[2]; // 图片的本地路径
        const title = match[3] || ""; // 图片的标题，可能为空
    
        // 调用接口函数获取实际图片URL
        const imageUrl = getRelateImageURL(localPath);
        if (imageUrl != localPath) {
            result.replaceCount += 1;
        }
        // 构建替换后的字符串
        const replacement = `![${altText}](${imageUrl} "${title}")`;
    
        // 替换原始文本
        modifiedText = modifiedText.replace(match[0], replacement);
        result.assetsCount += 1;
    }
    
    debugPush("修改后kramedown", modifiedText);
    // 写入数据库
    await updateBlockAPI(modifiedText, blockId);
    return result;

    // 模拟的接口函数，根据本地路径返回实际图片URL
    function getRelateImageURL(localPath) {
        // 这里可以根据你的实际情况来获取实际图片URL
        for (let [key, oneAttr] of Object.entries(picgoAttrs)) {
            // 存在替换同一个块的可能，需要串行执行，或者先并发的sql获得所在的blockid再执行
            if (oneAttr.originUrl == localPath) {
                return oneAttr.url;
            }
        }
        debugPush("图片未找到对应项", localPath);
        return localPath;
    }
}

function setStyle() {
    const head = document.getElementsByTagName('head')[0];
    const style = document.createElement('style');
    style.setAttribute("id", CONSTANTS.STYLE_ID);
    

    style.innerHTML = `

    `;
    head.appendChild(style);
}

function styleEscape(str) {
    if (!str) return "";
    return str.replace(new RegExp("<[^<]*style[^>]*>", "g"), "");
}

function removeStyle() {
    document.getElementById(CONSTANTS.STYLE_ID)?.remove();
}

/* ************ API 相关 **************** */
async function getAssetsInfoByAssetsPath(assetPath, hash, docId) {
    let sqlResponse = await sqlAPI(`
    SELECT * FROM (SELECT * FROM assets WHERE path = '${assetPath}' AND root_id = '${docId}') AS filtered_assets LEFT JOIN blocks ON filtered_assets.block_id = blocks.id AND blocks.type = 'p'`);
    if (sqlResponse != null && sqlResponse.length >= 1) {
        return sqlResponse;
    }
    return null;
}

async function getAllAssetsInfoByDocId(docId) {
    let sqlResponse = await sqlAPI(`
    SELECT * FROM (SELECT * FROM assets WHERE root_id = '${docId}') AS filtered_assets LEFT JOIN blocks ON filtered_assets.block_id = blocks.id AND blocks.type in ('p', 't')`);
    if (sqlResponse != null && sqlResponse.length >= 1) {
        return sqlResponse;
    }
    return null;
}

async function getAllAssetsBlockIdInDocId(docId) {
    let sqlResponse = await sqlAPI(`
    SELECT DISTINCT block_id FROM (SELECT * FROM assets WHERE root_id = '${docId}') AS filtered_assets LEFT JOIN blocks ON filtered_assets.block_id = blocks.id AND blocks.type in ('p', 't')`);
    if (sqlResponse != null && sqlResponse.length >= 1) {
        return sqlResponse;
    }
    return [];
}

function getNotebooks() {
    let notebooks = window.top.siyuan.notebooks;
    return notebooks;
}


function getFocusedBlock() {
    if (document.activeElement.classList.contains('protyle-wysiwyg')) {
        /* 光标在编辑区内 */
        let block = window.getSelection()?.focusNode?.parentElement; // 当前光标
        while (block != null && block?.dataset?.nodeId == null) block = block.parentElement;
        return block;
    }
    else return null;
}

function getFocusedBlockId() {
    const focusedBlock = getFocusedBlock();
    if (focusedBlock == null) {
        return null;
    }
    return focusedBlock.dataset.nodeId;
}

/**
 * 插入块（返回值有删减）
 * @param {string} text 文本
 * @param {string} blockid 指定的块
 * @param {string} textType 插入的文本类型，"markdown" or "dom"
 * @param {string} addType 插入到哪里？默认插入为指定块之后，NEXT 为插入到指定块之前， PARENT 为插入为指定块的子块
 * @return 对象，为response.data[0].doOperations[0]的值，返回码为-1时也返回null
 */
async function insertBlockAPI(text, blockid, addType = "previousID", textType = "markdown", ){
    let url = "/api/block/insertBlock";
    let data = {dataType: textType, data: text};
    switch (addType) {
        case "parentID":
        case "PARENT":
        case "parentId": {
            data["parentID"] = blockid;
            break;
        }
        case "nextID":
        case "NEXT":
        case "nextId": {
            data["nextID"] = blockid;
            break;
        }
        case "previousID":
        case "PREVIOUS":
        case "previousId": 
        default: {
            data["previousID"] = blockid;
            break;
        }
    }
    let response = await request(url, data);
    try{
        if (response.code == 0 && response.data != null && isValidStr(response.data[0].doOperations[0].id)){
            return response.data[0].doOperations[0];
        }
        if (response.code == -1){
            console.warn("插入块失败", response.msg);
            return null;
        }
    }catch(err){
        console.error(err);
        console.warn(response.msg);
    }
    return null;

}


/**
 * 更新块（返回值有删减）
 * @param {String} text 更新写入的文本
 * @param {String} blockid 更新的块id
 * @param {String} textType 文本类型，markdown、dom可选
 * @returns 对象，为response.data[0].doOperations[0]的值，返回码为-1时也返回null
 */
async function updateBlockAPI(text, blockid, textType = "markdown"){
    let url = "/api/block/updateBlock";
    let data = {dataType: textType, data: text, id: blockid};
    let response = await request(url, data);
    try{
        if (response.code == 0 && response.data != null &&  isValidStr(response.data[0].doOperations[0].id)){
            return response.data[0].doOperations[0];
        }
        if (response.code == -1){
            warnPush("更新块失败", response.msg);
            return null;
        }
    }catch(err){
        errorPush(err);
        warnPush(response.msg);
    }
    return null;
}

/**
 * 在html中显示文档icon
 * @param {*} iconString files[x].icon
 * @param {*} hasChild 
 * @returns 
 */
function getEmojiHtmlStr(iconString, hasChild) {
    if (g_setting.icon == CONSTANTS.ICON_NONE) return g_setting.linkDivider;
    // 无emoji的处理
    if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_ALL) return hasChild ? "📑" : "📄";//无icon默认值
    if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_CUSTOM_ONLY) return g_setting.linkDivider;
    let result = iconString;
    // emoji地址判断逻辑为出现.，但请注意之后的补全
    if (iconString.indexOf(".") != -1) {
        result = `<img class="iconpic" style="width: ${g_setting.fontSize}px" src="/emojis/${iconString}"/>`;
    } else {
        result = `<span class="emojitext">${emojiIconHandler(iconString, hasChild)}</span>`;
    }
    return result;
}
let emojiIconHandler = function (iconString, hasChild = false) {
    //确定是emojiIcon 再调用，printer自己加判断
    try {
        let result = "";
        iconString.split("-").forEach(element => {
            result += String.fromCodePoint("0x" + element);
        });
        return result;
    } catch (err) {
        console.error("emoji处理时发生错误", iconString, err);
        return hasChild ? "📑" : "📄";
    }
}

async function request(url, data) {
    let resData = null;
    await fetch(url, {
        body: JSON.stringify(data),
        method: 'POST'
    }).then(function (response) {
        resData = response.json();
    });
    return resData;
}

async function parseBody(response) {
    let r = await response;
    return r.code === 0 ? r.data : null;
}

async function pushMsg(msg, timeout = 4500) {
    let url = '/api/notification/pushMsg';
    let data = {
        "msg": msg,
        "timeout": timeout
    }
    return parseBody(request(url, data));
}

async function listDocsByPath({path, notebook = undefined, sort = undefined, maxListLength = undefined}) {
    let data = {
        path: path
    };
    if (notebook) data["notebook"] = notebook;
    if (sort) data["sort"] = sort;
    if (g_setting.docMaxNum != 0) {
        data["maxListCount"] = g_setting.docMaxNum >= 32 ? g_setting.docMaxNum : 32;
    } else {
        data["maxListCount"] = 0;
    }
    let url = '/api/filetree/listDocsByPath';
    return parseBody(request(url, data));
    //文档hepath与Markdown 内容
}

async function sqlAPI(stmt) {
    let data = {
        "stmt": stmt
    };
    let url = `/api/query/sql`;
    return parseBody(request(url, data));
}

async function getTreeStat(id) {
    let data = {
        "id": id
    };
    let url = `/api/block/getTreeStat`;
    return parseBody(request(url, data));
}

async function getDocInfo(id) {
    let data = {
        "id": id
    };
    let url = `/api/block/getDocInfo`;
    return parseBody(request(url, data));
}

async function getKramdown(blockid){
    let data = {
        "id": blockid
    };
    let url = "/api/block/getBlockKramdown";
    let response = await parseBody(request(url, data));
    if (response) {
        return response.kramdown;
    }
}

async function isDocHasAv(docId) {
    let sqlResult = await sqlAPI(`
    SELECT count(*) as avcount FROM blocks WHERE root_id = '${docId}'
    AND type = 'av'
    `);
    debugPush("文档 av判断", sqlResult);
    if (sqlResult.length > 0 && sqlResult[0].avcount > 0) {
        return true;
    } else {
        
        return false;
    }
}

async function isDocEmpty(docId, blockCountThreshold = 0) {
    // 检查父文档是否为空
    let treeStat = await getTreeStat(docId);
    if (blockCountThreshold == 0 && treeStat.wordCount != 0 && treeStat.imageCount != 0) {
        debugPush("treeStat判定文档非空，不插入挂件");
        return false;
    }
    if (blockCountThreshold != 0) {
        let blockCountSqlResult = await sqlAPI(`SELECT count(*) as bcount FROM blocks WHERE root_id like '${docId}' AND type in ('p', 'c', 'iframe', 'html', 'video', 'audio', 'widget', 'query_embed', 't')`);
        if (blockCountSqlResult.length > 0) {
            if (blockCountSqlResult[0].bcount > blockCountThreshold) {
                return false;
            } else {
                return true;
            }
        }
    }
    
    let sqlResult = await sqlAPI(`SELECT markdown FROM blocks WHERE 
        root_id like '${docId}' 
        AND type != 'd' 
        AND (type != 'p' 
           OR (type = 'p' AND length != 0)
           )
        LIMIT 5`);
    if (sqlResult.length <= 0) {
        return true;
    } else {
        debugPush("sql判定文档非空，不插入挂件");
        return false;
    }
    // 获取父文档内容
    let parentDocContent = await getKramdown(docId);
    // 简化判断，过长的父文档内容必定有文本，不插入 // 作为参考，空文档的kramdown长度约为400
    if (parentDocContent.length > 1000) {
        debugPush("父文档较长，认为非空，不插入挂件", parentDocContent.length);
        return;
    }
    // console.log(parentDocContent);
    // 清理ial和换行、空格
    let parentDocPlainText = parentDocContent;
    // 清理ial中的对象信息（例：文档块中的scrool字段），防止后面匹配ial出现遗漏
    parentDocPlainText = parentDocPlainText.replace(new RegExp('\\"{[^\n]*}\\"', "gm"), "\"\"")
    // console.log("替换内部对象中间结果", parentDocPlainText);
    // 清理ial
    parentDocPlainText = parentDocPlainText.replace(new RegExp('{:[^}]*}', "gm"), "");
    // 清理换行
    parentDocPlainText = parentDocPlainText.replace(new RegExp('\n', "gm"), "");
    // 清理空格
    parentDocPlainText = parentDocPlainText.replace(new RegExp(' +', "gm"), "");
    debugPush(`父文档文本（+标记）为 ${parentDocPlainText}`);
    debugPush(`父文档内容为空？${parentDocPlainText == ""}`);
    if (parentDocPlainText != "") return false;
    return true;
}

async function getCurrentDocIdF() {
    let thisDocId;
    thisDocId = window.top.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-background")?.getAttribute("data-node-id");
    debugPush("thisDocId by first id", thisDocId);
    if (!thisDocId && g_isMobile) {
        // UNSTABLE: 面包屑样式变动将导致此方案错误！
        try {
            let temp;
            temp = window.top.document.querySelector(".protyle-breadcrumb .protyle-breadcrumb__item .popover__block[data-id]")?.getAttribute("data-id");
            let iconArray = window.top.document.querySelectorAll(".protyle-breadcrumb .protyle-breadcrumb__item .popover__block[data-id]");
            for (let i = 0; i < iconArray.length; i++) {
                let iconOne = iconArray[i];
                if (iconOne.children.length > 0 
                    && iconOne.children[0].getAttribute("xlink:href") == "#iconFile"){
                    temp = iconOne.getAttribute("data-id");
                    break;
                }
            }
            thisDocId = temp;
        }catch(e){
            console.error(e);
            temp = null;
        }
    }
    if (!thisDocId) {
        thisDocId = window.top.document.querySelector(".protyle.fn__flex-1:not(.fn__none) .protyle-background")?.getAttribute("data-node-id");
        debugPush("thisDocId by background must match,  id", thisDocId);
    }
    return thisDocId;
}

function sleep(time){
    return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * 在点击<span data-type="block-ref">时打开思源块/文档
 * 为引入本项目，和原代码相比有更改
 * @refer https://github.com/leolee9086/cc-template/blob/6909dac169e720d3354d77685d6cc705b1ae95be/baselib/src/commonFunctionsForSiyuan.js#L118-L141
 * @license 木兰宽松许可证
 * @param {点击事件} event 
 */
let openRefLink = function(event, paramId = ""){
    
    let 主界面= window.parent.document
    let id = event?.currentTarget?.getAttribute("data-id") ?? paramId;
    // 处理笔记本等无法跳转的情况
    if (!isValidStr(id)) {return;}
    event?.preventDefault();
    event?.stopPropagation();
    let 虚拟链接 =  主界面.createElement("span")
    虚拟链接.setAttribute("data-type","block-ref")
    虚拟链接.setAttribute("data-id",id)
    虚拟链接.style.display = "none";//不显示虚拟链接，防止视觉干扰
    let 临时目标 = 主界面.querySelector(".protyle-wysiwyg div[data-node-id] div[contenteditable]")
    临时目标.appendChild(虚拟链接);
    let clickEvent = new MouseEvent("click", {
        ctrlKey: event?.ctrlKey,
        shiftKey: event?.shiftKey,
        altKey: event?.altKey,
        bubbles: true
    });
    虚拟链接.dispatchEvent(clickEvent);
    虚拟链接.remove();
}

function isValidStr(s){
    if (s == undefined || s == null || s === '') {
		return false;
	}
	return true;
}

let zh_CN = {
    
}

let en_US = {}
let language = zh_CN;

/* **************** 设置项相关 *****************
 * 
 */

/**
 * 由需要的设置项生成设置页面
 * @param {*} settingObject 
 */
function generateSettingPanelHTML(settingObjectArray) {
    let resultHTML = "";
    for (let oneSettingProperty of settingObjectArray) {
        let inputElemStr = "";
        oneSettingProperty.desp = oneSettingProperty.desp?.replace(new RegExp("<code>", "g"), "<code class='fn__code'>");
        if (oneSettingProperty.name.includes("🧪")) {
            oneSettingProperty.desp = language["setting_experimental"] + oneSettingProperty.desp;
        }
        let temp = `
        <label class="fn__flex b3-label">
            <div class="fn__flex-1">
                ${oneSettingProperty.name}
                <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
            </div>
            <span class="fn__space"></span>
            *#*##*#*
        </label>
        `;
        switch (oneSettingProperty.type) {
            case "NUMBER": {
                let min = oneSettingProperty.limit[0];
                let max = oneSettingProperty.limit[1];
                inputElemStr = `<input 
                    class="b3-text-field fn__flex-center fn__size200" 
                    id="${oneSettingProperty.id}" 
                    type="number" 
                    name="${oneSettingProperty.simpId}"
                    ${min == null || min == undefined ? "":"min=\"" + min + "\""} 
                    ${max == null || max == undefined ? "":"max=\"" + max + "\""} 
                    value="${oneSettingProperty.value}">`;
                break;
            }
            case "SELECT": {

                let optionStr = "";
                for (let option of oneSettingProperty.limit) {
                    let optionName = option.name;
                    if (!optionName) {
                        optionName = language[`setting_${oneSettingProperty.simpId}_option_${option.value}`];
                    }
                    optionStr += `<option value="${option.value}" 
                    ${option.value == oneSettingProperty.value ? "selected":""}>
                        ${optionName}
                    </option>`;
                }
                inputElemStr = `<select 
                    id="${oneSettingProperty.id}" 
                    name="${oneSettingProperty.simpId}"
                    class="b3-select fn__flex-center fn__size200">
                        ${optionStr}
                    </select>`;
                break;
            }
            case "TEXT": {
                inputElemStr = `<input class="b3-text-field fn__flex-center fn__size200" id="${oneSettingProperty.id}" name="${oneSettingProperty.simpId}" value="${oneSettingProperty.value}"></input>`;
                temp = `
                <label class="fn__flex b3-label config__item">
                    <div class="fn__flex-1">
                        ${oneSettingProperty.name}
                        <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
                    </div>
                    *#*##*#*
                </label>`
                break;
            }
            case "SWITCH": {
                inputElemStr = `<input 
                class="b3-switch fn__flex-center"
                name="${oneSettingProperty.simpId}"
                id="${oneSettingProperty.id}" type="checkbox" 
                ${oneSettingProperty.value?"checked=\"\"":""}></input>
                `;
                break;
            }
            case "TEXTAREA": {
                inputElemStr = `<textarea 
                name="${oneSettingProperty.simpId}"
                class="b3-text-field fn__block" 
                id="${oneSettingProperty.id}">${oneSettingProperty.value}</textarea>`;
                temp = `
                <label class="b3-label fn__flex">
                    <div class="fn__flex-1">
                        ${oneSettingProperty.name}
                        <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
                        <div class="fn__hr"></div>
                        *#*##*#*
                    </div>
                </label>`
                break;
            }
        }
        
        resultHTML += temp.replace("*#*##*#*", inputElemStr);
    }
    // console.log(resultHTML);
    return resultHTML;
}

/**
 * 由配置文件读取配置
 */
function loadCacheSettings() {
    // 检索当前页面所有设置项元素

}

/**
 * 由设置界面读取配置
 */
function loadUISettings(formElement) {
    let data = new FormData(formElement);
    // 扫描标准元素 input[]
    let result = {};
    for(const [key, value] of data.entries()) {
        // console.log(key, value);
        result[key] = value;
        if (value === "on") {
            result[key] = true;
        }else if (value === "null" || value == "false") {
            result[key] = "";
        }
    }
    let checkboxes = formElement.querySelectorAll('input[type="checkbox"]');
    for (let i = 0; i < checkboxes.length; i++) {
        let checkbox = checkboxes[i];
        // console.log(checkbox, checkbox.name, data[checkbox.name], checkbox.name);
        if (result[checkbox.name] == undefined) {
            result[checkbox.name] = false;
        }
    }

    let numbers = formElement.querySelectorAll("input[type='number']");
    // console.log(numbers);
    for (let number of numbers) {
        let minValue = number.getAttribute("min");
        let maxValue = number.getAttribute("max");
        let value = parseFloat(number.value);

        if (minValue !== null && value < parseFloat(minValue)) {
            number.value = minValue;
            result[number.name] = parseFloat(minValue);
        } else if (maxValue !== null && value > parseFloat(maxValue)) {
            number.value = maxValue;
            result[number.name] = parseFloat(maxValue);
        } else {
            result[number.name] = value;
        }
    }

    debugPush("UI SETTING", result);
    return result;
}

function isMobile() {
    return window.top.document.getElementById("sidebar") ? true : false;
};

module.exports = {
    default: DoubleClickFileTreePlugin,
};