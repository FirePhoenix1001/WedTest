# -*- mode: python ; coding: utf-8 -*-

import os
import sys

block_cipher = None

# Ensure the paths are resolved correctly relative to spec file location
project_dir = os.path.abspath(os.path.dirname(__file__))

a = Analysis(
    [os.path.join(project_dir, 'src', 'main.py')],
    pathex=[project_dir],
    binaries=[],
    datas=[
        (os.path.join(project_dir, 'src', 'static'), 'static'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'yt_dlp',
        'faster_whisper',
        'opencc',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SunflowerWebStudio',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False to hide the black CMD window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
