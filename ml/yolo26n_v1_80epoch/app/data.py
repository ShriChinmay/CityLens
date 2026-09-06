"""Dataset audit (notebook Cell 4) + label health."""
from pathlib import Path

def audit(root="pothole_data", tiny_thr=0.0005):
    root = Path(root)
    for split in ["train","valid"]:
        imgs = list((root/split/"images").glob("*.jpg")) + list((root/split/"images").glob("*.png"))
        tiny, huge, missing, empty = [], [], [], []
        for im in imgs:
            lb = root/split/"labels"/(im.stem+".txt")
            if not lb.exists(): missing.append(im.name); continue
            if lb.stat().st_size==0: empty.append(im.name); continue
            for line in open(lb):
                p = line.split()
                if len(p)!=5: continue
                _,cx,cy,w,h = map(float,p)
                if w*h < tiny_thr: tiny.append(im.name)
                if w>0.8 and h>0.5: huge.append(im.name)
        print(f"{split}: {len(imgs)} imgs | tiny:{len(set(tiny))} huge:{len(set(huge))} missing:{len(missing)} empty:{len(empty)}")
    # really broken: >15 boxes or w==1.0
    print("\nreally broken (spam/full-width):")
    for split in ["train","valid"]:
        for lb in sorted((root/split/"labels").glob("*.txt")):
            lines = [l for l in open(lb) if l.strip()]
            if len(lines)>15:
                print(f"  {split}/{lb.stem}: {len(lines)} boxes"); continue
            for line in lines:
                _,cx,cy,w,h = map(float,line.split())
                if w>=0.99:
                    print(f"  {split}/{lb.stem}: full-width w={w}"); break

def write_data_yaml(train_img, val_img, out="data.yaml"):
    Path(out).write_text(f"train: {train_img}\nval: {val_img}\nnc: 1\nnames: ['pothole']\n")
    print(open(out).read())

if __name__ == "__main__":
    import sys
    audit(sys.argv[1] if len(sys.argv)>1 else "pothole_data")
