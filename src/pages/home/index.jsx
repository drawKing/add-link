import React, {Component} from 'react';
import {Button, Form, Slider, Table, Input, Upload, message, Popover} from "antd";
import {DownloadOutlined, UploadOutlined, PictureOutlined, WarningOutlined, QuestionCircleOutlined, GithubOutlined} from '@ant-design/icons';
import _ from 'lodash';
import {Rnd} from 'react-rnd';
import JSZip from 'jszip';
import {saveAs} from 'file-saver';
import config from 'src/commons/config-hoc';
import PageContent from 'src/layouts/page-content';
import {FormElement, Operator} from "../../library/components";
import generateHtml from "./template/template";
import detail from './img/detail.jpg';
import help1 from './img/help1.png';
import help2 from './img/help2.png';
import help3 from './img/help3.png';
import './style.less';

const {Dragger} = Upload;

const LEFT_TO_MIN = 125 + 16 - 1;
const TOP_TO_MIN = 70 + 16;
const rndBottom = {
    width: '90%',
    height: 10,
    bottom: -1,
    left: '5%'
};
const rndBottomRight = {
    width: 10,
    height: 10,
    right: -1,
    bottom: -1
};
const rndRight = {
    width: 5,
    height: '90%',
    top: '5%',
    right: -1
};

@config({
    path: '/',
    title: {text: '首页', icon: 'home'},
    breadcrumbs: [{key: 'home', text: '首页', icon: 'home'}],
    noAuth: true
})
export default class Home extends Component {
    constructor(props) {
        super(props);

        this.handleScroll = _.throttle(this.handleScroll, 100);
        this.handleChangeRadio = _.debounce(this.handleChangeRadio, 150)
    }

    state = {
        loading: false,
        scrollHeight: 0,
        scrollTop: 0, // 滚动高度。计算画框时的位置
        position: {
            w: 0,
            h: 0,
            l: 0,
            t: 0
        },
        drawDataSource: [],
        curId: '', // 当前选中的某个方框，记录id。与表格联动
        curDeleteId: '', // 记录当前要删除的id。更改方框样式
        curPic: '', // 当前展示的 pic
        isOnHelp: false,
        isOnGit: false,
    };

    copyCurPic = ''; // 创建一份 当前图片的副本。在压缩时会用到
    qualityVal = 1; // 图片质量
    startPos = {x: 0, y: 0}; // 起始位置
    endPos = {x: 0, y: 0}; // 结束位置
    isClickDown = false; // 在画板中是否按下鼠标

    columns = [
        {title: '编号', dataIndex: 'id', width: 80},
        {
            title: '跳转链接',
            dataIndex: 'link',
            width: 200,
            render: (value, record) => <Input onChange={(e) => record.link = e.target.value} placeholder='www.baidu.com'/>
        },
        {title: '宽度', dataIndex: 'w', width: 80},
        {title: '高度', dataIndex: 'h', width: 80},
        {title: '距左部', dataIndex: 'l', width: 80},
        {title: '距顶部', dataIndex: 't', width: 80},
        {
            title: '操作',
            dataIndex: 'operator',
            width: 60,
            render: (value, record) => {
                const items = [
                    {
                        label: '删除',
                        color: 'red',
                        confirm: {
                            title: `您确定删除吗?`,
                            onConfirm: () => this.handleDelete(record.id),
                            onMouseEnter: () => this.setState({curDeleteId: record.id}),
                            onMouseLeave: () => this.setState({curDeleteId: ''})
                        },
                    },
                ];

                return <Operator items={items}/>;
            },
        },
    ];

    componentDidMount() {
        // 只有滚动时，才能拿到 可滚动高度。将高度设置给蒙层
        this.scrollWrap.addEventListener('scroll', this.handleScroll);
    }

    handleScroll = () => {
        const scrollWrap = this.scrollWrap;
        let scrollHeight = 0;

        if (scrollWrap.scrollHeight !== scrollHeight) {
            this.setState({
                scrollHeight: scrollWrap.scrollHeight,
                scrollTop: scrollWrap.scrollTop
            })
        }
    };

    // 删除某一个方框
    handleDelete = (id) => {
        const {drawDataSource} = this.state;
        const data = drawDataSource.filter(it => it.id !== id);

        this.setState({drawDataSource: data})
    };

    dealPosition = (e) => {
        const x = e.clientX - LEFT_TO_MIN;
        const y = e.clientY - TOP_TO_MIN;

        return {x, y};
    };

    // 鼠标按下
    handleMouseDown = (e) => {
        this.startPos = this.dealPosition(e);

        const {position} = this.state;
        const {x, y} = this.startPos;

        this.isClickDown = true;
        this.setState({
            position: {...position, l: x, t: y, scrollTop: this.state.scrollTop},
        })
    };

    // 移动中
    handleMouseMove = (e) => {
        const {x: startX, y: startY} = this.startPos;

        if (this.isClickDown) {
            this.endPos = this.dealPosition(e);

            const {x, y} = this.endPos;

            this.setState({
                // 定义宽高。x 和 y 需要特殊处理，因为可能反方向去画框
                position: {
                    w: Math.abs(x - startX),
                    h: Math.abs(y - startY),
                    l: x > startX ? startX : x,
                    t: y > startY ? startY : y,
                    scrollTop: this.state.scrollTop
                }
            });
        }
    };

    // 移动结束
    handleMouseUp = (e) => {
        e && e.preventDefault();

        const {position, drawDataSource} = this.state;
        const {w, h} = position;
        const isDraw = w >= 5 && h >= 5; // 设置最小可画框

        // 恢复初始状态
        this.setState({
            position: {w: 0, h: 0, l: 0, t: 0},
            drawDataSource: isDraw ? [...drawDataSource, {id: Math.random().toString().substr(-6), ...position}] : drawDataSource, // 收集所有的框
        });
        this.isClickDown = false;
        this.startPos = {x: 0, y: 0};
        this.endPos = {x: 0, y: 0};
    };

    // 根据 ID 查找移动的是哪个方框
    delayIdToFind = (id) => {
        const {drawDataSource} = this.state;

        return drawDataSource.find(it => it.id === id);
    };

    // 移动具体某个方框时
    handleDragStop = (e, d, id) => {
        const cur = this.delayIdToFind(id);

        cur.l = d.x;
        cur.t = d.y;

        this.isClickDown = false;
        this.setState({drawDataSource: this.state.drawDataSource,})
    };

    // 放大缩小具体某个方框时
    handleResizeStop = (e, direction, ref, delta, position, id) => {
        const cur = this.delayIdToFind(id);

        cur.w = parseInt(ref.style.width);
        cur.h = parseInt(ref.style.height);

        this.setState({
            drawDataSource: this.state.drawDataSource
        });
    };

    // 转换成 base64。需创建多个 canvas
    convertImageToBase64 = (image) => {
        return new Promise((resolve) => {
            let img = new Image();
            let CUT_RADIO = this.form.getFieldValue('cutRadio');

            img.crossOrigin = "Anonymous"; // img 允许跨域
            img.src = image;

            img.onload = () => {
                let j = 0;
                const res = [];

                if (!CUT_RADIO) CUT_RADIO = img.height; // 如果没有填写切割比例，默认只生成一张图

                for (let i = 0; i < img.height; i += CUT_RADIO) {
                    let canvas = document.createElement("canvas");
                    let ctx = canvas.getContext("2d");
                    const areaHeight = img.height - i; // 剩余未裁剪的高度

                    canvas.height = areaHeight < CUT_RADIO ? areaHeight : CUT_RADIO;
                    canvas.width = img.width;

                    ctx.drawImage(img, 0, i, img.width, CUT_RADIO, 0, 0, img.width, CUT_RADIO);

                    res[j] = canvas.toDataURL("image/jpeg", this.qualityVal); // 获取Base64编码; 更改图片质量
                    j++;

                    if (res.length === Math.ceil(img.height / CUT_RADIO)) {
                        resolve(res);
                    }
                }
            };
        });
    };

    // 下载成 zip
    handleDownToZip = (html, base64) => {
        return new Promise((resolve => {
            const zip = new JSZip();
            const img = zip.folder("images");

            zip.file("index.html", html);

            base64.forEach((it, idx) => {
                img.file(`detail-${idx + 1}.jpg`, it.split(',')[1], {base64: true}); // 要 split 之后取它的第一项
            });

            zip.generateAsync({type: "blob"})
                .then(content => {
                    saveAs(content, "download.zip");

                    resolve();
                    message.success('导出成功~');
                });
        }))
    };

    // 导出
    handleExport = async () => {
        const {drawDataSource, curPic} = this.state;

        // 校验 是否填写跳转链接
        for (const it of drawDataSource) {
            if (it && !it.link) return message.error('请在表格中填写跳转链接~');
        }

        const base64 = await this.convertImageToBase64(curPic);
        let links = '';
        let imgStr = '';

        this.setState({loading: true});

        base64.forEach((it, idx) => {
            imgStr += `<img src="./images/detail-${idx + 1}.jpg"  class="cut-pic" alt="${idx}" />`
        });

        drawDataSource.forEach(it => {
            const radio = this.handleDealRelative(it);
            const {topRadio, leftRadio, heightRadio, widthRadio} = radio;

            links += `<a class="cut-link" width="${widthRadio}" height="${heightRadio}" left="${leftRadio}" top="${topRadio}" style="position: absolute; display: block; opacity: 0;" href="${(it.link && it.link.includes('http') ? it.link : 'http://' + it.link) || ''}" rel="noopener noreferrer" target="_blank"/></a>\n`;
        });

        const html = generateHtml(links, `<div style="display: flex; flex-direction: column">${imgStr}</div>`);

        await this.handleDownToZip(html, base64);

        this.setState({loading: false});
    };

    // 计算相对比例 相对宽度：400。高度：650。左边距：400。距顶部：图片高度
    // 这里不进行 toFixed 设定。避免产生误差
    handleDealRelative = ({w, h, l, t, scrollTop}) => {
        const imgHeight = parseInt(window.getComputedStyle(this.bgImg).height);
        const widthRadio = (w / 400);
        const heightRadio = (h / imgHeight);
        const leftRadio = (l / 400);
        const topRadio = ((t + scrollTop) / imgHeight);

        return {
            widthRadio,
            heightRadio,
            leftRadio,
            topRadio
        }
    };

    // 上传前 获取图片 路径等
    handleUploadBefore = (file) => {
        const reader = new FileReader();

        reader.readAsDataURL(file);
        reader.onload = () => {
            const img = document.createElement('img');

            img.src = reader.result;
            img.onload = () => {
                this.setState({
                    curPic: reader.result,
                    drawDataSource: []
                });

                this.copyCurPic = reader.result;
                this.form.setFieldsValue({
                    size: this.handleTransformSize(file.size),
                    radio: 100,
                });

                message.success('上传成功~');
            };
        };
    };

    // 修改压缩比例时，动态更新图片清晰度
    handleChangeRadio = (val) => {
        let img = new Image();

        img.crossOrigin = "Anonymous"; // img 允许跨域
        img.src = this.copyCurPic; // 每次压缩时，去改变 copy 出来的副本，不去影响真正的 curPic

        img.onload = () => {
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");

            canvas.height = img.height;
            canvas.width = img.width;

            ctx.drawImage(img, 0, 0);

            // 压缩图片，将图片 base64 字节转化成 kb
            let base64 = canvas.toDataURL("image/jpeg", val / 100);

            const strLen = base64.replace('data:image/jpeg;base64,', '').length;
            const fileLen = strLen - (strLen / 8) * 2; // 8 位一个字节

            this.qualityVal = val / 100;
            this.form.setFieldsValue({
                size: this.handleTransformSize(fileLen)
            });

            this.setState({curPic: base64});
        };
    };

    // b KB MB 转换公式
    handleTransformSize = (limit) => {
        let size = 0;

        if (limit < 0.1 * 1024) {
            size = limit.toFixed(2) + " B";
        } else if (limit < 0.1 * 1024 * 1024) {
            size = (limit / 1024).toFixed(2) + " KB";
        } else if (limit < 0.1 * 1024 * 1024 * 1024) {
            // 如果小于0.1GB 转化成 MB
            size = (limit / (1024 * 1024)).toFixed(2) + " MB";
        } else {
            // 其他转化成GB
            size = (limit / (1024 * 1024 * 1024)).toFixed(2) + " GB";
        }

        return size;
    };

    // 展示 帮助的 tooltip
    handleShowContent = () => {
        const commonStyle = {padding: '5px 0'};
        const commonStyleParent = {margin: '5px 0'};

        return (
            <div>
                <div>
                    <div><b>1.</b> 点击按钮上传需要进行裁剪、添加热区的图片。</div>
                </div>
                <div style={commonStyleParent}>
                    <div style={commonStyle}><b>2.</b> 按住鼠标拖动所选区域，<b>在松开鼠标后也可对所画区域进行移动及缩放。</b></div>
                    <img src={help1} alt="help1" style={{width: 400}}/>
                </div>
                <div style={commonStyleParent}>
                    <div style={commonStyle}><b>3.</b> 在右侧表格填写<b>跳转链接及裁切比例（默认300）</b>，且可对所选区域进行<b>删除</b>。</div>
                    <img src={help2} alt="help2" style={{width: 400}}/>
                </div>
                <div style={commonStyleParent}>
                    <div style={commonStyle}><b>4.</b> 点击导出，下载到本地的文件包括 <b>index.html 和 images 文件夹</b>。</div>
                    <img src={help3} alt="help3" style={{width: 400}}/>
                </div>
            </div>
        )
    };

    // 创建 a 标签 跳转 github
    handleJumpToGit = () => {
        const link = document.createElement('a');

        link.setAttribute('href', 'https://github.com/drawKing');
        link.setAttribute('target', '_blank');

        link.style.visibility = 'hidden';
        document.body.appendChild(link);

        link.click();
        document.body.removeChild(link);
    };

    render() {
        const {scrollHeight, scrollTop, position: {w, h, l, t}, drawDataSource, curId, curDeleteId, curPic = '', loading, isOnGit, isOnHelp} = this.state;
        const formProps = {
            width: 600,
            labelWidth: 60
        };
        const props = {
            name: 'file',
            accept: '.jpg,.png',
            multiple: false,
            showUploadList: false,
            transformFile: this.handleUploadBefore
        };

        return (
            <PageContent styleName="root">
                <div styleName="left">
                    <div style={{display: 'none'}}/>
                    <div styleName="pic-wrap" ref={node => this.scrollWrap = node}>
                        {curPic ? <img src={curPic} alt="bg" ref={node => this.bgImg = node}/> : null}
                        {
                            curPic ? <>
                                {/* 蒙层 */}
                                <div
                                    styleName="pic-drop"
                                    style={{height: scrollHeight || 650 - 2}}
                                    onMouseDown={this.handleMouseDown}
                                    onMouseMove={this.handleMouseMove}
                                    onMouseUp={this.handleMouseUp}
                                >
                                    {/*  所有的框  */}
                                    {
                                        drawDataSource.map(({w, h, l, t, id}) => (
                                            <Rnd
                                                size={{width: w, height: h}}
                                                position={{x: l, y: t}}
                                                key={id}
                                                styleName='rnd'
                                                style={{background: id === curDeleteId ? 'rgba(255,0,0,.5)' : ''}}
                                                onDragStart={() => this.setState({curId: id}, () => this.isClickDown = false)}
                                                onDragStop={(e, d) => this.handleDragStop(e, d, id)}
                                                onResizeStop={(e, direction, ref, delta, position) => this.handleResizeStop(e, direction, ref, delta, position, id)}
                                                enableResizing={{
                                                    bottom: true,
                                                    bottomLeft: false,
                                                    bottomRight: true,
                                                    left: false,
                                                    right: true,
                                                    top: false,
                                                    topLeft: false,
                                                    topRight: false
                                                }}
                                                resizeHandleStyles={{
                                                    right: rndRight,
                                                    bottomRight: rndBottomRight,
                                                    bottom: rndBottom,
                                                }}
                                            />
                                        ))
                                    }
                                </div>
                                {/* 画出来的方框 */}
                                <div style={{position: 'absolute', width: w, height: h, left: l, top: t + scrollTop, background: 'rgba(255,215,0,.5)'}}/>
                            </> : <Dragger {...props}>
                                <p className="ant-upload-drag-icon">
                                    <PictureOutlined/>
                                </p>
                                <p className="ant-upload-text">点击上传文件</p>
                                <p className="ant-upload-hint">
                                    也可点击右上角【导入图片】。支持 .jpg .png 图片格式 <br/>
                                    <span style={{color: 'rgba(0, 0, 0, 0.75)'}}>鼠标画出想要添加链接的区域，并在右侧表格填写对应跳转链接。</span>
                                </p>
                            </Dragger>
                        }
                    </div>
                </div>
                <canvas id='canvas' style={{display: 'none'}}/>
                <div styleName="right">
                    <div styleName='btn-list'>
                        <Upload {...props}>
                            <Button type="primary" icon={<UploadOutlined/>} style={{marginRight: 10}}>导入图片</Button>
                        </Upload>
                        <Button type="primary" icon={<DownloadOutlined/>} onClick={this.handleExport} disabled={!curPic} loading={loading}>导出</Button>
                    </div>
                    <Form
                        initialValues={{
                            cutRadio: 300,
                            radio: 100,
                        }}
                        ref={node => this.form = node}
                    >
                        <FormElement
                            {...formProps}
                            width={300}
                            label="示例图片"
                            type='select'
                            name="pic"
                            options={[
                                {label: '示例图片 1', value: detail}
                            ]}
                            onChange={(val) => this.setState({curPic: val}, () => {
                                if (!val) {
                                    this.form.setFieldsValue({
                                        size: '',
                                        radio: 100
                                    });
                                    this.setState({drawDataSource: []})
                                } else {
                                    this.form.setFieldsValue({
                                        size: '0.64 MB', // 示例图片写死，不再去重新计算了
                                        radio: 100,
                                    })
                                }
                                this.copyCurPic = val;
                            })}
                        />
                        <FormElement
                            {...formProps}
                            label="压缩比例"
                            name="radio"
                            onChange={this.handleChangeRadio}
                        >
                            <Slider tooltipVisible disabled={!curPic}/>
                        </FormElement>
                        <FormElement
                            {...formProps}
                            width={300}
                            label="压缩大小"
                            name="size"
                            disabled
                            placeholder=''
                        />
                        <div style={{display: 'flex'}}>
                            <FormElement
                                {...formProps}
                                width={300}
                                label="裁切高度"
                                name="cutRadio"
                                type='number'
                                placeholder='裁剪后每张图片的高度'
                            />
                            <span style={{color: 'red', padding: '10px 0 0 10px'}}><WarningOutlined style={{marginRight: 5}}/>数值越大，裁切后每张图片高度越大</span>
                        </div>
                    </Form>
                    <Table
                        columns={this.columns}
                        dataSource={drawDataSource}
                        rowKey="id"
                        scroll={{y: 450}}
                        pagination={false}
                        rowClassName={(record) => record.id === curId ? 'show-bg' : ''}
                    />
                </div>
                <div styleName='operator'>
                    <Popover content={this.handleShowContent} title="使用帮助" placement='left'>
                        <div styleName='operator-one' onMouseMove={() => this.setState({isOnHelp: true})} onMouseLeave={() => this.setState({isOnHelp: false})}>
                            {
                                !isOnHelp ? <QuestionCircleOutlined style={{fontSize: 18, color: '#D9DDE1'}}/> : <div style={{width: 24}}>使用帮助</div>
                            }
                        </div>
                    </Popover>
                    <span styleName='hr'/>
                    <div
                        styleName='operator-one'
                        onMouseMove={() => this.setState({isOnGit: true})}
                        onMouseLeave={() => this.setState({isOnGit: false})}
                        onClick={this.handleJumpToGit}
                    >
                        {
                            !isOnGit ? <GithubOutlined style={{fontSize: 18, color: '#D9DDE1'}}/> : <div style={{width: 24}}>点击跳转</div>
                        }
                    </div>
                </div>
            </PageContent>
        );
    }
}
