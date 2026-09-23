import urllib.request
import re

html_url = "https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_East_Nusa_Tenggara.svg"
req = urllib.request.Request(html_url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        matches = re.findall(r'href="(https://upload\.wikimedia\.org/wikipedia/commons/thumb/[^"]+\.png)"', html)
        if matches:
            for png_url in matches:
                if '500px' in png_url:
                    print(f"Found PNG URL: {png_url}")
                    try:
                        img_req = urllib.request.Request(png_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(img_req) as img_resp, open('assets/images/logo_ntt.png', 'wb') as out_file:
                            out_file.write(img_resp.read())
                        print("Successfully downloaded to assets/images/logo_ntt.png")
                        break
                    except Exception as e:
                        print('Download error:', e)
        else:
            print("Could not find png URL in HTML.")
except Exception as e:
    print('Error:', e)
