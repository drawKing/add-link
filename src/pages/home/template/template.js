export default function generateHtml(links, allPic) {
    return `
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <title>Document</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                }
                .detail {
                    position: relative;
                }
                .detail img {
                    width: 100%;
                }
            </style>
        </head>
        <body>
        <div class="detail" id="detail">
            ${links}

            ${allPic}
        </div>
        <script>
            window.onload = function () {
                handleShowPosition();
            };
            window.onresize = function() {
                handleShowPosition();
            }
            function handleShowPosition() {
                const detail = document.getElementById('detail');
                const imgArr = document.getElementsByClassName('cut-pic');
                const links = document.getElementsByClassName('cut-link');
                const imgWidth = document.documentElement.clientWidth; // 默认获取当前可视窗口宽度，可自行调整

                let imgHeight = 0;
                for (let i = 0; i < imgArr.length; i++) {
                    const it = imgArr[i];

                    imgHeight += parseInt(window.getComputedStyle(it).height); // 获取所有 img 加起来的高度
                }

                detail.style.width = imgWidth + 'px';
                detail.style.height = imgHeight + 'px';

                for (let i = 0; i < links.length; i++) {
                    const it = links[i];

                    it.style.width = (parseFloat(it.attributes['width'].nodeValue) * imgWidth).toFixed(2) + 'px';
                    it.style.height =(parseFloat(it.attributes['height'].nodeValue) * imgHeight).toFixed(2) + 'px';
                    it.style.left = (parseFloat(it.attributes['left'].nodeValue) * imgWidth).toFixed(2) + 'px';
                    it.style.top = (parseFloat(it.attributes['top'].nodeValue) * imgHeight).toFixed(2) + 'px';
                }
            }
        </script>
        </body>
        </html>
    `
}
