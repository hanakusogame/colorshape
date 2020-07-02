import { MainScene } from "./MainScene";
import { SceneComment } from "@atsumaru/api-types";
declare function require(x: string): any;

//メインのゲーム画面
export class MainGame extends g.E {
	public reset: () => void;
	public finish: () => void;
	public setMode: (num: number) => void;
	//public box2dDestroy: () => void;

	constructor(scene: MainScene) {
		const tl = require("@akashic-extension/akashic-timeline");
		var b2 = require("@akashic-extension/akashic-box2d");
		const timeline = new tl.Timeline(scene);
		super({ scene: scene, x: 0, y: 0, width: 640, height: 360, touchable: true });

		const bg = new g.FilledRect({
			scene: scene,
			width: 640,
			height: 360,
			cssColor: "black",
			opacity: 0.5
		});
		this.append(bg);

		let shapeBase = new g.E({
			scene: scene,
			width: 640,
			height: 360,
		});
		this.append(shapeBase);

		const box2d = new b2.Box2D({
			gravity: [0, 0.1],//デフォルト9.8
			scale: 50,
			sleep: false//trueにした方がいいらしい
		});

		const createFloor = (x: number, y: number, w: number, h: number, n: number) => {

			var floor = new g.FilledRect({
				scene: scene,
				width: w,
				height: h,
				x: x,
				y: y,
				cssColor: "blue"
			});
			this.append(floor);

			var floorFixDef = box2d.createFixtureDef({
				density: 1.0, // 密度
				friction: 0.5, // 摩擦係数
				restitution: 0.3, // 反発係数
				shape: box2d.createRectShape(floor.width, floor.height) // 形状
			});

			var floorDef = box2d.createBodyDef({
				type: b2.BodyType.Static
			});

			var floorBody = box2d.createBody(floor, floorDef, floorFixDef);
			floorBody.b2body.entity = floor;
			floor.tag = n;
			return floor;
		}


		//多角形の頂点を求める(n:頂点数　r:半径)
		const getPoints = (n: number, r: number) => {
			const points: { x: number, y: number }[] = [];

			const radian = 2 * Math.PI / n;//回転量

			for (let i = 0; i < n; i++) {
				const rad = radian * i - (Math.PI / 2);
				const x = Math.cos(rad) * r;
				const y = Math.sin(rad) * r;
				points.push({ x: x, y: y });
			}
			return points;
		}

		const createShape = (x: number, y: number, s: number, n: number) => {

			const base = new g.E({
				scene: scene,
				x: x, y: y,
				width: s, height: s,
				touchable: true,
				opacity: 0.8,
				angle: scene.random.get(0, 360)
			});

			shapeBase.append(base);

			const sprite = new g.FrameSprite({
				scene: scene,
				src: scene.assets.shape as g.ImageAsset,
				width: 100, height: 100,
				anchorX: 0,
				anchorY: 0,
				scaleX: s / 100,
				scaleY: s / 100,
				frames: [n - 3],
				frameNumber: 0,
			});

			base.append(sprite);

			const points = getPoints(n, base.width / 2);

			//線を引く
			for (let i = 0; i < points.length; i++) {

				const p1 = points[i];
				const p2 = points[(i + 1) % points.length];

				//距離
				const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

				//角度
				const radian = Math.atan2(p2.y - p1.y, p2.x - p1.x);
				const degree = box2d.degree(radian) - 90;

				const pos = { x: p1.x + (base.width / 2), y: p1.y + (base.height / 2) }

				//線
				const line = new g.FilledRect({
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
				base.append(line);
			}

			//座標をbox2d用に変換
			const vertices: any = [];
			points.forEach((p) => {
				vertices.push(box2d.vec2(p.x, p.y));
			});

			var spriteFixDef = box2d.createFixtureDef({
				density: s / 100, // 密度
				friction: 0.5, // 摩擦係数
				restitution: 0.3, // 反発係数
				shape: box2d.createPolygonShape(vertices) // 形状
				//shape: box2d.createCircleShape(38)
			});

			var spriteDef = box2d.createBodyDef({
				type: b2.BodyType.Dynamic,
				userData: base
			});

			var spriteBody = box2d.createBody(base, spriteDef, spriteFixDef);

			const b2body = spriteBody.b2body;

			base.pointDown.add((e) => {
				//回転された座標が来るので、逆回転して座標を得ている
				const x = (e.point.x - (base.width / 2));//中央からの座標
				const y = (e.point.y - (base.height / 2));
				const r = (box2d.radian(base.angle));
				const xx = x * Math.cos(r) - y * Math.sin(r);
				//b2body.ApplyImpulse(box2d.vec2(x, -50), b2body.GetPosition());
				b2body.SetLinearVelocity(box2d.vec2(-(xx * 3 * (100 / s)), -100));
			});

			spriteBody.b2body.entity = base;
			spriteBody.b2body.body = spriteBody;
			spriteBody.b2body.num = n;
			spriteBody.b2body.combo = 0;
			base.tag = 2;
		}

		var contactListener = new b2.Box2DWeb.Dynamics.b2ContactListener;

		//エフェクト生成と表示と削除
		const setEffect = (sprite: g.E, str: string) => {

			const effectNum = new g.Label({
				scene: scene,
				x: sprite.x + (sprite.width - 32) / 2,
				y: sprite.y + (sprite.height - 32) / 2,
				font: scene.numFontBlue,
				fontSize: 32,
				text: str
			});
			this.append(effectNum);

			const effect = new g.FrameSprite({
				scene: scene,
				x: sprite.x + (sprite.width - 120) / 2,
				y: sprite.y + (sprite.height - 120) / 2,
				width: 120,
				height: 120,
				src: scene.assets["effect"] as g.ImageAsset,
				frames: [0, 1, 2],
				interval: 100,
				opacity: 0.8
			});
			this.append(effect);
			effect.start();

			timeline.create(effectNum).moveBy(0, -20, 200).wait(200).call(() => {
				effectNum.destroy();
				effect.destroy();
			});
		}

		//ゴミの数の表示と１０個溜まった時の減点処理
		let isStop = false;
		const setTrash = () => {

			const num = fixs.length;

			const colors = ["blue", "orange", "red"];
			let colorNum = 0;
			if (num > 8) {
				colorNum = 2;
			} else if (num > 6) {
				colorNum = 1;
			}
			for (let i = 0; i < 10; i++) {
				if (num > i) {
					trash[i].cssColor = colors[colorNum];
				} else {
					trash[i].cssColor = "gray";
				}
				trash[i].modified();
			}

			if (num >= 10) {
				isStop = true;
				line.cssColor = "black";
				line.modified();

				fixs.forEach(e => {
					timeline.create(e).moveBy(0, 150, 500);
				});

				scene.addScore(-1000);

				scene.playSound("biri");

				scene.setTimeout(() => {
					isStop = false;
					line.cssColor = "white";
					line.modified();
					fixs.length = 0;
					fixs.forEach(e => {
						e.destroy();
					});

					for (let i = 0; i < 10; i++) {
						trash[i].cssColor = "gray";
						trash[i].modified();
					}

				}, 2000);
			}
		}

		//接触した時
		const destroys: any[] = [];
		let moves: any[] = [];
		let fixs: g.E[] = [];
		contactListener.BeginContact = (contact: any) => {
			if (isStop) return;

			var bodyA = contact.GetFixtureA().GetBody();
			var bodyB = contact.GetFixtureB().GetBody();

			if (bodyA.entity && bodyB.entity) {
				const bodys: any[] = [bodyA, bodyB];
				const isLine = bodys.some(e => e.entity.tag === 1);
				const isWall = bodys.some(e => e.entity.tag === 0);
				if (isLine) {
					//下部の線と接触した時
					bodys.forEach(body => {
						let sprite: g.E = body.entity;
						if (sprite.tag === 3) {

							//消える判定がついているスプライト
							sprite.children.forEach((e: g.FilledRect) => {
								e.cssColor = "yellow";
								e.modified();
							});
							destroys.push(body.body);//物理判定を消すリストに格納
							timeline.create(sprite).moveBy(0, 150, 1000).call(() => {
								sprite.destroy();
							});

							const score = Math.pow(body.combo, 2) * 240;
							scene.addScore(score);
							setEffect(sprite, "+" + score);

							line.cssColor = "yellow";
							line.modified();

							scene.playSound("clear1");

						} else if (sprite.tag === 2) {
							//消えないスプライト
							sprite.children.forEach((e: g.FilledRect) => {
								e.cssColor = "black";
								e.modified();
							});
							sprite.opacity = 0.5;
							destroys.push(body.body);//物理判定を消すリストに格納

							fixs.push(sprite);
							setTrash();

							timeline.create().every((a: number, b: number) => {
								sprite.opacity = (1 - b) / 2;
							}, 10000).call(() => {
								if (isStop) return;
								fixs = fixs.filter(n => n !== sprite);
								setTrash();
							});

							line.cssColor = "red";
							line.modified();

							scene.playSound("miss");

						}

					});
				} else if (!isWall) {
					if (!bodys.every((item) => item.num === bodys[0].num && item.entity.y > -item.entity.height)) return;

					const comboCnt = Math.max(bodyA.combo, bodyB.combo) + 1;
					//スプライト同士がぶつかった時
					bodys.forEach(body => {
						const sprite: g.E = body.entity;

						if (bodyA.entity.tag === 2 || bodyB.entity.tag === 2) {
							setEffect(sprite, "" + comboCnt);
							body.combo = comboCnt;
						}
					});

					bodys.forEach(body => {
						const sprite: g.E = body.entity;

						if (sprite.tag === 2) {
							sprite.children.forEach((e: g.FilledRect) => {
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

		}

		//離れた時
		//contactListener.EndContact = function (contact: any) {}

		box2d.world.SetContactListener(contactListener);

		/*
		const b2body = ballBody.b2body;
		ball.pointDown.add(() => {
			b2body.ApplyImpulse(box2d.vec2(150, -150), b2body.GetPosition());
		});
		*/

		let frameCnt = 0;
		let testCnt = 30;
		const arrSize = [50, 50, 50, 60, 60, 70, 80];
		this.update.add(() => {
			if (!scene.isStart || isStop) return;

			// 物理エンジンの世界を進める
			box2d.step(1 / g.game.fps);

			destroys.forEach(e => box2d.removeBody(e));
			destroys.length = 0;

			moves = moves.filter(body => {
				body.b2body.ApplyImpulse(box2d.vec2(0, 4), body.b2body.GetPosition());

				const entity: g.E = body.entity;
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
				const num = scene.random.get(3, 6);
				const s = arrSize[scene.random.get(0, 6)];
				createShape(scene.random.get(20, 430), -120, s, num);
			}

			frameCnt++;

			if (frameCnt % (30 * 5) === 0) {
				testCnt--;
			}

		});

		this.finish = () => {
			box2d.destroy();
		};

		createFloor(30, -100, 5, 460, 0);
		createFloor(565, -100, 5, 460, 0);
		const line = createFloor(30, 320, 540, 5, 1);
		line.cssColor = "white";
		line.modified();

		//ゴミの数メーター
		const trashBase = new g.FilledRect({
			scene: scene,
			x: 575,
			y: 200,
			width: 60,
			height: 155,
			cssColor: "white"
		});
		this.append(trashBase);

		const trash: g.FilledRect[] = [];
		for (let i = 9; i >= 0; i--) {
			const spr = new g.FilledRect({
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
		this.reset = () => {
			this.append(shapeBase);
			destroys.length = 0;
			moves.length = 0;

			for (let i = 0; i < 2; i++) {
				for (let j = 0; j < 4; j++) {
					const num = scene.random.get(3, 6)
					const size = scene.random.get(0, 6);
					createShape(j * 130 + ((i + 1) * 50), -100 + (100 * i), arrSize[size], num);
				}
			}
		};

	}
}