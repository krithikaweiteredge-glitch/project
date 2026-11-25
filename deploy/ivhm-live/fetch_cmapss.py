"""Download NASA C-MAPSS (FD001) for the airliner engine replay. Used at image build time."""
import io
import sys
import urllib.request
import zipfile

URL = "https://phm-datasets.s3.amazonaws.com/NASA/6.+Turbofan+Engine+Degradation+Simulation+Data+Set.zip"
WANT = {"train_FD001.txt", "test_FD001.txt", "RUL_FD001.txt"}


def extract(zf, out, found):
    for name in zf.namelist():
        base = name.rsplit("/", 1)[-1]
        if base in WANT:
            with open(f"{out}/{base}", "wb") as f:
                f.write(zf.read(name))
            found.add(base)
        elif name.lower().endswith(".zip"):          # the NASA archive nests the data in another zip
            extract(zipfile.ZipFile(io.BytesIO(zf.read(name))), out, found)


out = sys.argv[1]
data = urllib.request.urlopen(URL, timeout=300).read()
found = set()
extract(zipfile.ZipFile(io.BytesIO(data)), out, found)
missing = WANT - found
if missing:
    sys.exit(f"C-MAPSS files missing from the download: {sorted(missing)}")
print("C-MAPSS FD001 ready:", sorted(found))
