let scene, camera, renderer, surface;
let isRotating = false;
let rotationAnimation;
let controls; // OrbitControlsのインスタンス
let rotationSurface; // 回転体のメッシュ
let areaText; // 面積表示用のHTML要素
let volumeText; // 体積表示用のHTML要素
let shapeText; // 回転体の種類表示用のHTML要素

function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth / 2, 400);
    renderer.setClearColor(0xffffff, 1);
    document.getElementById('graph3D').innerHTML = '';
    document.getElementById('graph3D').appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    camera.position.set(15, 15, 15);
    controls.update();

    const gridSize = 10;
    const gridDivisions = 10;
    
    // XZ平面のグリッド
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions);
    scene.add(gridHelper);

    // 軸の追加
    const axes = new THREE.AxesHelper(gridSize);
    scene.add(axes);

    // 照明設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    animate();
}

// 軸ラベルを追加する関数
function addAxisLabel(text, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(0.5, 0.5, 0.5);
    scene.add(sprite);
}

function customLog(x, base) {
    if (base === 'e') return Math.log(x);
    return Math.log(x) / Math.log(base);
}

function calculateRotationArea(points, axis) {
    let area = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const r1 = axis === 'x' ? points[i].y : points[i].x;
        const r2 = axis === 'x' ? points[i + 1].y : points[i + 1].x;
        const h = Math.abs(
            axis === 'x' ? points[i + 1].x - points[i].x : points[i + 1].y - points[i].y
        );
        // 円錐台の表面積の公式
        area += Math.PI * (r1 + r2) * Math.sqrt(h * h + (r2 - r1) * (r2 - r1));
    }
    return area;
}

function calculateVolume(points, axis, start, end) {
    let volume = 0;
    const isXAxis = axis === 'x';
    
    // 積分の区間を指定された範囲に制限
    const filteredPoints = points.filter(p => {
        const coord = isXAxis ? p.x : p.y;
        return coord >= start && coord <= end;
    });
    
    for (let i = 0; i < filteredPoints.length - 1; i++) {
        const p1 = filteredPoints[i];
        const p2 = filteredPoints[i + 1];
        const r1 = isXAxis ? Math.abs(p1.y) : Math.abs(p1.x);
        const r2 = isXAxis ? Math.abs(p2.y) : Math.abs(p2.x);
        const h = Math.abs(
            isXAxis ? p2.x - p1.x : p2.y - p1.y
        );
        
        // 円錐台の体積の公式: V = πh(r1² + r1r2 + r2²)/3
        volume += Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2) / 3;
    }
    
    return volume;
}

// 式の接頭辞を更新する関数
function updateEquationPrefix() {
    const isYFunction = document.querySelector('input[name="variable"]:checked').value === 'y';
    const prefix = document.querySelector('.equation-prefix');
    prefix.textContent = isYFunction ? 'y = ' : 'x = ';
}

// ラジオボタンの変更イベントリスナー
document.querySelectorAll('input[name="variable"]').forEach(radio => {
    radio.addEventListener('change', updateEquationPrefix);
});

function generateGraph() {
    const formula = document.getElementById('formula').value;
    const isYFunction = document.querySelector('input[name="variable"]:checked').value === 'y';
    const xMin = parseFloat(document.getElementById('xMin').value);
    const xMax = parseFloat(document.getElementById('xMax').value);
    const yMin = parseFloat(document.getElementById('yMin').value);
    const yMax = parseFloat(document.getElementById('yMax').value);
    
    const values = [];
    const results = [];
    
    try {
        const compiledFormula = math.compile(formula);
        
        // 独立変数の範囲を設定
        const min = isYFunction ? xMin : yMin;
        const max = isYFunction ? xMax : yMax;
        const step = (max - min) / 200; // より滑らかな曲線のために点数を増やす
        
        for (let val = min; val <= max; val += step) {
            try {
                const scope = {};
                scope[isYFunction ? 'x' : 'y'] = val;
                const result = compiledFormula.evaluate(scope);
                
                // 結果が有効な数値の場合のみ追加
                if (isFinite(result)) {
                    values.push(val);
                    results.push(result);
                }
            } catch (e) {
                continue; // エラーの場合はスキップ
            }
        }
        
        // グラフデータの作成
        const trace2D = {
            x: isYFunction ? values : results,
            y: isYFunction ? results : values,
            mode: 'lines',
            type: 'scatter',
            line: { color: '#6366f1', width: 3 }
        };
        
        const layout = {
            transition: {
                duration: 500,
                easing: 'cubic-in-out'
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: { t: 20, r: 20, b: 40, l: 40 },
            xaxis: {
                range: [xMin, xMax],
                zeroline: true,
                gridcolor: '#e2e8f0'
            },
            yaxis: {
                range: [yMin, yMax],
                zeroline: true,
                gridcolor: '#e2e8f0'
            }
        };
        
        Plotly.newPlot('graph2D', [trace2D], layout);
        
        // 3Dグラフの更新
        init3D();
        create3DSurface(trace2D.x, trace2D.y);
        
    } catch (e) {
        alert('数式の形式が正しくありません: ' + e.message);
        return;
    }
}

function create3DSurface(xVals, yVals) {
    if (surface) scene.remove(surface);
    if (rotationSurface) scene.remove(rotationSurface);

    // スケール調整
    const maxVal = Math.max(
        Math.abs(Math.max(...xVals)),
        Math.abs(Math.min(...xVals)),
        Math.abs(Math.max(...yVals)),
        Math.abs(Math.min(...yVals))
    );
    const scale = maxVal > 0 ? 5 / maxVal : 1;

    // 曲線の生成
    const points = [];
    for (let i = 0; i < xVals.length; i++) {
        if (yVals[i] !== null && isFinite(yVals[i])) {
            points.push(new THREE.Vector2(
                xVals[i] * scale,
                yVals[i] * scale
            ));
        }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
        color: 0x6366f1,
        linewidth: 2
    });
    surface = new THREE.Line(geometry, material);
    scene.add(surface);

    // 面積計算用のポイント配列を作成
    const surfacePoints = points.map(p => ({ x: p.x, y: p.y }));
    
    // 面積表示要素の更新
    if (!areaText) {
        areaText = document.createElement('div');
        areaText.className = 'area-display';
        document.getElementById('graph3D').appendChild(areaText);
    }
}

function determineRotationShape(points, axis, start, end) {
    const isXAxis = axis === 'x';
    const filteredPoints = points.filter(p => {
        const coord = isXAxis ? p.x : p.y;
        return coord >= start && coord <= end;
    });

    // Y軸との交点をチェック
    const hasYIntersection = filteredPoints.some(p => {
        const mainCoord = isXAxis ? p.x : p.y;
        const crossCoord = isXAxis ? p.y : p.x;
        return Math.abs(crossCoord) < 0.1 && mainCoord >= start && mainCoord <= end;
    });

    // 回転軸との最小距離
    const minDistance = Math.min(...filteredPoints.map(p => 
        Math.abs(isXAxis ? p.y : p.x)
    ));

    // すべての点の座標をチェック
    const allPositive = filteredPoints.every(p => 
        (isXAxis ? p.y : p.x) > 0 || Math.abs(isXAxis ? p.y : p.x) < 0.1
    );
    const allNegative = filteredPoints.every(p => 
        (isXAxis ? p.y : p.x) < 0 || Math.abs(isXAxis ? p.y : p.x) < 0.1
    );

    // 回転体の種類を判定
    let shapeType = {
        name: '',
        description: '',
        features: []
    };

    if (minDistance > 3) {
        shapeType.name = 'トーラス（ドーナツ型）';
        shapeType.description = '中央に穴のある環状の立体';
        shapeType.features = ['中空構造', '連続した表面', '回転対称性'];
    } else if (hasYIntersection) {
        if (allPositive || allNegative) {
            shapeType.name = '円錐型';
            shapeType.description = '先端が尖った円錐状の立体';
            shapeType.features = ['尖った頂点', '円形の底面', '傾斜のある側面'];
        } else {
            shapeType.name = '双曲面';
            shapeType.description = '中央がくびれた砂時計型の立体';
            shapeType.features = ['対称的なくびれ', '無限に伸びる表面', '双曲線の回転'];
        }
    } else if (minDistance < 0.1) {
        shapeType.name = '円柱型';
        shapeType.description = '上下の底面が平行な円柱状の立体';
        shapeType.features = ['平行な円形底面', '一定の半径', '直線的な側面'];
    } else {
        shapeType.name = '一般的な回転体';
        shapeType.description = '複雑な曲線による回転体';
        shapeType.features = ['変化する断面', '滑らかな表面'];
    }

    return shapeType;
}

function createRotationSurface(axis) {
    if (!surface) return;

    const start = parseFloat(document.getElementById('rotationStart').value);
    const end = parseFloat(document.getElementById('rotationEnd').value);
    
    // 現在の曲線の点を取得
    const points = [];
    const position = surface.geometry.attributes.position;
    
    // 点のスケーリングと収集
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        
        // 回転軸に応じて点をフィルタリング
        const coord = axis === 'x' ? x : y;
        if (coord >= start && coord <= end) {
            // Y軸周りの回転の場合、XZ平面での回転になるように点を配置
            if (axis === 'y') {
                points.push(new THREE.Vector2(x, y));
            } else if (axis === 'x') {
                // X軸周りの回転の場合、YZ平面での回転
                points.push(new THREE.Vector2(y, 0));
            } else if (axis === 'z') {
                // Z軸周りの回転の場合、XY平面での回転
                points.push(new THREE.Vector2(x, y));
            }
        }
    }

    if (points.length < 2) {
        alert('指定された範囲内に十分な点がありません。');
        return;
    }

    // 回転体の生成
    const segments = 64;
    const latheGeometry = new THREE.LatheGeometry(
        points,
        segments,
        0,
        Math.PI * 2
    );
    
    // マテリアルの設定を変更
    const latheMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b9cf7,  // より柔らかい紫色
        transparent: true,
        opacity: 0.45,    // より透明に
        side: THREE.DoubleSide,
        shininess: 20,    // 光沢を抑える
        flatShading: false,
        specular: 0x4455ff,  // 反射光の色
        emissive: 0x112244,  // 発光色を追加
        emissiveIntensity: 0.1  // 発光の強さ
    });
    
    if (rotationSurface) {
        scene.remove(rotationSurface);
    }
    
    rotationSurface = new THREE.Mesh(latheGeometry, latheMaterial);

    // 回転軸に応じて回転体を適切に配置
    switch (axis) {
        case 'x':
            rotationSurface.rotation.z = Math.PI / 2;
            break;
        case 'y':
            // デフォルトはY軸周りの回転なので調整不要
            break;
        case 'z':
            rotationSurface.rotation.x = Math.PI / 2;
            break;
    }

    scene.add(rotationSurface);

    // 表面積と体積の計算・表示
    const area = calculateRotationArea(points, axis);
    const volume = calculateVolume(points, axis, start, end);
    
    if (!areaText) {
        areaText = document.createElement('div');
        areaText.className = 'area-display';
        document.getElementById('graph3D').appendChild(areaText);
    }
    if (!volumeText) {
        volumeText = document.createElement('div');
        volumeText.className = 'volume-display';
        document.getElementById('graph3D').appendChild(volumeText);
    }

    areaText.textContent = `回転体の表面積: ${area.toFixed(2)}`;
    volumeText.textContent = `回転体の体積: ${volume.toFixed(2)}`;

    // 照明を調整
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);

    // 回転アニメーション
    let rotation = 0;
    const animate = () => {
        if (rotation >= Math.PI * 2) return;
        rotation += 0.05;
        
        switch (axis) {
            case 'x':
                rotationSurface.rotation.x = rotation;
                break;
            case 'y':
                rotationSurface.rotation.y = rotation;
                break;
            case 'z':
                rotationSurface.rotation.z = rotation;
                break;
        }
        
        rotationAnimation = requestAnimationFrame(animate);
    };
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function rotate3D() {
    const axis = document.getElementById('rotationAxis').value;
    createRotationSurface(axis);
}

// 初期化時に式の接頭辞を設定
document.addEventListener('DOMContentLoaded', updateEquationPrefix);

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
    if (renderer) {
        camera.aspect = window.innerWidth / 2 / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth / 2, 400);
    }
});
