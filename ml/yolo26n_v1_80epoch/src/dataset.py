"""Dataset: audit, data.yaml, hard mining, broken labels."""
from pathlib import Path

def audit(root="pothole_data", tiny_thr=0.0005):
    root = Path(root)
    for split in ["train", "valid"]:
        imgs = list((root/split/"images").glob("*.jpg")) + list((root/split/"images").glob("*.png"))
        tiny, huge, missing, empty = set(), set(), [], []
        for im in imgs:
            lb = root/split/"labels"/(im.stem+".txt")
            if not lb.exists(): missing.append(im.name); continue
            if lb.stat().st_size == 0: empty.append(im.name); continue
            for line in open(lb):
                p = line.split()
                if len(p) != 5: continue
                _, cx, cy, w, h = map(float, p)
                if w*h < tiny_thr: tiny.add(im.name)
                if w > 0.8 and h > 0.5: huge.add(im.name)
        print(f"{split}: {len(imgs)} | tiny:{len(tiny)} huge:{len(huge)} missing:{len(missing)} empty:{len(empty)}")

def broken(root="pothole_data"):
    """Spam (>15 boxes), full-width w==1.0, impossible tiny."""
    root = Path(root)
    for split in ["train", "valid"]:
        for lb in sorted((root/split/"labels").glob("*.txt")):
            lines = [l for l in open(lb) if l.strip()]
            if len(lines) > 15:
                print(f"{split}/{lb.stem}: {len(lines)} boxes"); continue
            for line in lines:
                _, cx, cy, w, h = map(float, line.split())
                if w >= 0.99:
                    print(f"{split}/{lb.stem}: full-width"); break
                if w*h < 0.00015:
                    print(f"{split}/{lb.stem}: tiny"); break

def write_data_yaml(train_img, val_img, out="data.yaml"):
    Path(out).write_text(f"train: {train_img}\nval: {val_img}\nnc: 1\nnames: ['pothole']\n")

def hard_files(val_images_dir):
    return [str(Path(val_images_dir)/n) for n in
            ["pothole_816.jpg","pothole_752.jpg","pothole_666.jpg","pothole_846.jpg"]]
