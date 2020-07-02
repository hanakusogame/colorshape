"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
//メインのゲーム画面
var MainGame = /** @class */ (function (_super) {
    __extends(MainGame, _super);
    //public box2dDestroy: () => void;
    function MainGame(scene) {
        var _this = this;
        var tl = require("@akashic-extension/akashic-timeline");
        var b2 = require("@akashic-extension/akashic-box2d");
        var timeline = new tl.Timeline(scene);
        _this = _super.call(this, { scene: scene, x: 0, y: 0, width: 640, height: 360, touchable: true }) || this;
        var bg = new g.FilledRect({
            scene: scene,
            width: 640,
            height: 360,
            cssColor: "black",
            opacity: 0.5
        });
        _this.append(bg);
        var shapeBase = new g.E({
            scene: scene,
            width: 640,
            height: 360,
        });
        _this.append(shapeBase);
        var box2d = new b2.Box2D({
            gravity: [0, 0.1],
            scale: 50,
            sleep: false //trueにした方がいいらしい
        });
        var createFloor = function (x, y, w, h, n) {
            var floor = new g.FilledRect({
                scene: scene,
                width: w,
                height: h,
                x: x,
                y: y,
                cssColor: "blue"
            });
            _this.append(floor);
            var floorFixDef = box2d.createFixtureDef({
                density: 1.0,
                friction: 0.5,
                restitution: 0.3,
                shape: box2d.createRectShape(floor.width, floor.height) // 形状
            });
            var floorDef = box2d.createBodyDef({
                type: b2.BodyType.Static
            });
            var floorBody = box2d.createBody(floor, floorDef, floorFixDef);
            floorBody.b2body.entity = floor;
            floor.tag = n;
            return floor;
        };
        //多角形の頂点を求める(n:頂点数　r:半径)
        var getPoints = function (n, r) {
            var points = [];
            var radian = 2 * Math.PI / n; //回転量
            for (var i = 0; i < n; i++) {
                var rad = radian * i - (Math.PI / 2);
                var x = Math.cos(rad) * r;
                var y = Math.sin(rad) * r;
                points.push({ x: x, y: y });
            }
            return points;
        };
        var createShape = function (x, y, s, n) {
            var base = new g.E({
                scene: scene,
                x: x, y: y,
                width: s, height: s,
                touchable: true,
                opacity: 0.8,
                angle: scene.random.get(0, 360)
            });
            shapeBase.append(base);
            var sprite = new g.FrameSprite({
                scene: scene,
                src: scene.assets.shape,
                width: 100, height: 100,
                anchorX: 0,
                anchorY: 0,
                scaleX: s / 100,
                scaleY: s / 100,
                frames: [n - 3],
                frameNumber: 0,
            });
            base.append(sprite);
            var points = getPoints(n, base.width / 2);
            //線を引く
            for (var i = 0; i < points.length; i++) {
                var p1 = points[i];
                var p2 = points[(i + 1) % points.length];
                //距離
                var distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                //角度
                var radian = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                var degree = box2d.degree(radian) - 90;
                var pos = { x: p1.x + (base.width / 2), y: p1.y + (base.height / 2) };
                //線
                var line_1 = new g.FilledRect({
                    scene: scene,
                    width: 4,
                    height: distance,
                    x: pos.x,
                    y: pos.y,
                    anchorX: (n === 3) ? 0.6 : 1,
                    anchorY: 0,
                    angle: degree,
                    cssColor: "white"
                });
                base.append(line_1);
            }
            //座標をbox2d用に変換
            var vertices = [];
            points.forEach(function (p) {
                vertices.push(box2d.vec2(p.x, p.y));
            });
            var spriteFixDef = box2d.createFixtureDef({
                density: s / 100,
                friction: 0.5,
                restitution: 0.3,
                shape: box2d.createPolygonShape(vertices) // 形状
                //shape: box2d.createCircleShape(38)
            });
            var spriteDef = box2d.createBodyDef({
                type: b2.BodyType.Dynamic,
                userData: base
            });
            var spriteBody = box2d.createBody(base, spriteDef, spriteFixDef);
            var b2body = spriteBody.b2body;
            base.pointDown.add(function (e) {
                //回転された座標が来るので、逆回転して座標を得ている
                var x = (e.point.x - (base.width / 2)); //中央からの座標
                var y = (e.point.y - (base.height / 2));
                var r = (box2d.radian(base.angle));
                var xx = x * Math.cos(r) - y * Math.sin(r);
                //b2body.ApplyImpulse(box2d.vec2(x, -50), b2body.GetPosition());
                b2body.SetLinearVelocity(box2d.vec2(-(xx * 3 * (100 / s)), -100));
            });
            spriteBody.b2body.entity = base;
            spriteBody.b2body.body = spriteBody;
            spriteBody.b2body.num = n;
            spriteBody.b2body.combo = 0;
            base.tag = 2;
        };
        var contactListener = new b2.Box2DWeb.Dynamics.b2ContactListener;
        //エフェクト生成と表示と削除
        var setEffect = function (sprite, str) {
            var effectNum = new g.Label({
                scene: scene,
                x: sprite.x + (sprite.width - 32) / 2,
                y: sprite.y + (sprite.height - 32) / 2,
                font: scene.numFontBlue,
                fontSize: 32,
                text: str
            });
            _this.append(effectNum);
            var effect = new g.FrameSprite({
                scene: scene,
                x: sprite.x + (sprite.width - 120) / 2,
                y: sprite.y + (sprite.height - 120) / 2,
                width: 120,
                height: 120,
                src: scene.assets["effect"],
                frames: [0, 1, 2],
                interval: 100,
                opacity: 0.8
            });
            _this.append(effect);
            effect.start();
            timeline.create(effectNum).moveBy(0, -20, 200).wait(200).call(function () {
                effectNum.destroy();
                effect.destroy();
            });
        };
        //ゴミの数の表示と１０個溜まった時の減点処理
        var isStop = false;
        var setTrash = function () {
            var num = fixs.length;
            var colors = ["blue", "orange", "red"];
            var colorNum = 0;
            if (num > 8) {
                colorNum = 2;
            }
            else if (num > 6) {
                colorNum = 1;
            }
            for (var i = 0; i < 10; i++) {
                if (num > i) {
                    trash[i].cssColor = colors[colorNum];
                }
                else {
                    trash[i].cssColor = "gray";
                }
                trash[i].modified();
            }
            if (num >= 10) {
                isStop = true;
                line.cssColor = "black";
                line.modified();
                fixs.forEach(function (e) {
                    timeline.create(e).moveBy(0, 150, 500);
                });
                scene.addScore(-1000);
                scene.playSound("biri");
                scene.setTimeout(function () {
                    isStop = false;
                    line.cssColor = "white";
                    line.modified();
                    fixs.length = 0;
                    fixs.forEach(function (e) {
                        e.destroy();
                    });
                    for (var i = 0; i < 10; i++) {
                        trash[i].cssColor = "gray";
                        trash[i].modified();
                    }
                }, 2000);
            }
        };
        //接触した時
        var destroys = [];
        var moves = [];
        var fixs = [];
        contactListener.BeginContact = function (contact) {
            if (isStop)
                return;
            var bodyA = contact.GetFixtureA().GetBody();
            var bodyB = contact.GetFixtureB().GetBody();
            if (bodyA.entity && bodyB.entity) {
                var bodys_1 = [bodyA, bodyB];
                var isLine = bodys_1.some(function (e) { return e.entity.tag === 1; });
                var isWall = bodys_1.some(function (e) { return e.entity.tag === 0; });
                if (isLine) {
                    //下部の線と接触した時
                    bodys_1.forEach(function (body) {
                        var sprite = body.entity;
                        if (sprite.tag === 3) {
                            //消える判定がついているスプライト
                            sprite.children.forEach(function (e) {
                                e.cssColor = "yellow";
                                e.modified();
                            });
                            destroys.push(body.body); //物理判定を消すリストに格納
                            timeline.create(sprite).moveBy(0, 150, 1000).call(function () {
                                sprite.destroy();
                            });
                            var score = Math.pow(body.combo, 2) * 240;
                            scene.addScore(score);
                            setEffect(sprite, "+" + score);
                            line.cssColor = "yellow";
                            line.modified();
                            scene.playSound("clear1");
                        }
                        else if (sprite.tag === 2) {
                            //消えないスプライト
                            sprite.children.forEach(function (e) {
                                e.cssColor = "black";
                                e.modified();
                            });
                            sprite.opacity = 0.5;
                            destroys.push(body.body); //物理判定を消すリストに格納
                            fixs.push(sprite);
                            setTrash();
                            timeline.create().every(function (a, b) {
                                sprite.opacity = (1 - b) / 2;
                            }, 10000).call(function () {
                                if (isStop)
                                    return;
                                fixs = fixs.filter(function (n) { return n !== sprite; });
                                setTrash();
                            });
                            line.cssColor = "red";
                            line.modified();
                            scene.playSound("miss");
                        }
                    });
                }
                else if (!isWall) {
                    if (!bodys_1.every(function (item) { return item.num === bodys_1[0].num && item.entity.y > -item.entity.height; }))
                        return;
                    var comboCnt_1 = Math.max(bodyA.combo, bodyB.combo) + 1;
                    //スプライト同士がぶつかった時
                    bodys_1.forEach(function (body) {
                        var sprite = body.entity;
                        if (bodyA.entity.tag === 2 || bodyB.entity.tag === 2) {
                            setEffect(sprite, "" + comboCnt_1);
                            body.combo = comboCnt_1;
                        }
                    });
                    bodys_1.forEach(function (body) {
                        var sprite = body.entity;
                        if (sprite.tag === 2) {
                            sprite.children.forEach(function (e) {
                                e.cssColor = "yellow";
                                e.modified();
                            });
                            sprite.tag = 3;
                            sprite.opacity = 1.0;
                            sprite.modified();
                            moves.push(body.body);
                        }
                    });
                    scene.playSound("se_hit");
                }
            }
        };
        //離れた時
        //contactListener.EndContact = function (contact: any) {}
        box2d.world.SetContactListener(contactListener);
        /*
        const b2body = ballBody.b2body;
        ball.pointDown.add(() => {
            b2body.ApplyImpulse(box2d.vec2(150, -150), b2body.GetPosition());
        });
        */
        var frameCnt = 0;
        var testCnt = 30;
        var arrSize = [50, 50, 50, 60, 60, 70, 80];
        _this.update.add(function () {
            if (!scene.isStart || isStop)
                return;
            // 物理エンジンの世界を進める
            box2d.step(1 / g.game.fps);
            destroys.forEach(function (e) { return box2d.removeBody(e); });
            destroys.length = 0;
            moves = moves.filter(function (body) {
                body.b2body.ApplyImpulse(box2d.vec2(0, 4), body.b2body.GetPosition());
                var entity = body.entity;
                if (entity.y > 360 + entity.height / 2) {
                    box2d.removeBody(body);
                    //エンティティが存在しないもしくはすでに破棄されているパターンがあるらしい(わかっていない)
                    if (entity && !entity.destroyed) {
                        entity.destroy();
                    }
                    return false;
                }
                return true;
            });
            //スプライトを発生させる	
            if (frameCnt % testCnt === 0) {
                var num = scene.random.get(3, 6);
                var s = arrSize[scene.random.get(0, 6)];
                createShape(scene.random.get(20, 430), -120, s, num);
            }
            frameCnt++;
            if (frameCnt % (30 * 5) === 0) {
                testCnt--;
            }
        });
        _this.finish = function () {
            box2d.destroy();
        };
        createFloor(30, -100, 5, 460, 0);
        createFloor(565, -100, 5, 460, 0);
        var line = createFloor(30, 320, 540, 5, 1);
        line.cssColor = "white";
        line.modified();
        //ゴミの数メーター
        var trashBase = new g.FilledRect({
            scene: scene,
            x: 575,
            y: 200,
            width: 60,
            height: 155,
            cssColor: "white"
        });
        _this.append(trashBase);
        var trash = [];
        for (var i = 9; i >= 0; i--) {
            var spr = new g.FilledRect({
                scene: scene,
                x: 3,
                y: 3 + (15 * i),
                width: 54,
                height: 13,
                cssColor: "gray"
            });
            trashBase.append(spr);
            trash.push(spr);
        }
        //リセット
        _this.reset = function () {
            _this.append(shapeBase);
            destroys.length = 0;
            moves.length = 0;
            for (var i = 0; i < 2; i++) {
                for (var j = 0; j < 4; j++) {
                    var num = scene.random.get(3, 6);
                    var size = scene.random.get(0, 6);
                    createShape(j * 130 + ((i + 1) * 50), -100 + (100 * i), arrSize[size], num);
                }
            }
        };
        return _this;
    }
    return MainGame;
}(g.E));
exports.MainGame = MainGame;
