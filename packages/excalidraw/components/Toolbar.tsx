import clsx from "clsx";
import { useState } from "react";

import { KEYS } from "@excalidraw/common";
import { CaptureUpdateAction, newElement } from "@excalidraw/element";

import { useTunnels } from "../context/tunnels";
import { t } from "../i18n";

import { useEditorInterface, useStylesPanelMode } from "./App";
import { HintViewer } from "./HintViewer";
import { Dialog } from "./Dialog";
import CodeMirrorEditor from "./TTDDialog/CodeMirrorEditor";
import "./CodeBlockDialog.scss";
import { Island } from "./Island";
import { LockButton } from "./LockButton";
import { PenModeButton } from "./PenModeButton";
import Stack from "./Stack";
import DropdownMenu from "./dropdownMenu/DropdownMenu";
import {
  drawShapeToolIcon,
  EmbedIcon,
  frameToolIcon,
  LassoIcon,
  laserPointerToolIcon,
  bucketFillIcon,
  MagicIcon,
  mermaidLogoIcon,
  DotsIcon,
} from "./icons";
import {
  ArrowToolButton,
  DiamondToolButton,
  EllipseToolButton,
  EraserToolButton,
  FreedrawToolPopover,
  FreedrawToolButton,
  getToolShortcut,
  HandToolButton,
  ImageToolButton,
  isToolButtonDisabled,
  LassoToolButton,
  LineToolButton,
  RectangleToolButton,
  SelectionToolButton,
  SelectionToolPopover,
  TextToolButton,
} from "./Tools";

import type {
  AppClassProperties,
  AppProps,
  AppState,
  UIAppState,
} from "../types";

const ExtraToolsDropdown = ({
  app,
  activeTool,
  setAppState,
}: {
  app: AppClassProperties;
  activeTool: UIAppState["activeTool"];
  setAppState: React.Component<any, AppState>["setState"];
}) => {
  const [isExtraToolsMenuOpen, setIsExtraToolsMenuOpen] = useState(false);
  const [codeBlockDraft, setCodeBlockDraft] = useState<{
    isOpen: boolean;
    elementId: string | null;
    title: string;
    language: string;
    code: string;
  }>({
    isOpen: false,
    elementId: null,
    title: "Example",
    language: "javascript",
    code: "console.log(\"Hello, world!\");",
  });
  const selectedCodeBlocks = app.scene.getNonDeletedElements().filter(
    (element) =>
      app.state.selectedElementIds[element.id] &&
      element.type === "rectangle" &&
      element.customData?.codeBlock,
  );
  const isFullStylesPanel = useStylesPanelMode() === "full";
  const { TTDDialogTriggerTunnel } = useTunnels();

  const frameToolSelected = activeTool.type === "frame";
  const drawShapeToolSelected = activeTool.type === "autoshape";
  const laserToolSelected = activeTool.type === "laser";
  const bucketFillToolSelected = activeTool.type === "bucketfill";
  const lassoToolSelected =
    isFullStylesPanel &&
    activeTool.type === "lasso" &&
    app.state.preferredSelectionTool.type !== "lasso";
  const embeddableToolSelected = activeTool.type === "embeddable";

  return (
    <DropdownMenu open={isExtraToolsMenuOpen}>
      <DropdownMenu.Trigger
        className={clsx("App-toolbar__extra-tools-trigger", {
          "App-toolbar__extra-tools-trigger--selected":
            frameToolSelected ||
            embeddableToolSelected ||
            (isFullStylesPanel && drawShapeToolSelected) ||
            lassoToolSelected ||
            bucketFillToolSelected ||
            // in collab we're already highlighting the laser button
            // outside toolbar, so let's not highlight extra-tools button
            // on top of it
            (laserToolSelected && !app.props.isCollaborating),
        })}
        onToggle={() => {
          setIsExtraToolsMenuOpen(!isExtraToolsMenuOpen);
          setAppState({ openMenu: null, openPopup: null });
        }}
        title={t("toolBar.extraTools")}
      >
        {frameToolSelected
          ? frameToolIcon
          : embeddableToolSelected
          ? EmbedIcon
          : isFullStylesPanel && drawShapeToolSelected
          ? drawShapeToolIcon
          : laserToolSelected && !app.props.isCollaborating
          ? laserPointerToolIcon
          : lassoToolSelected
          ? LassoIcon
          : bucketFillToolSelected
          ? bucketFillIcon
          : DotsIcon}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        onClickOutside={() => setIsExtraToolsMenuOpen(false)}
        onSelect={() => setIsExtraToolsMenuOpen(false)}
        className="App-toolbar__extra-tools-dropdown"
      >
        <DropdownMenu.Item
          onSelect={() => app.setActiveTool({ type: "frame" })}
          icon={frameToolIcon}
          shortcut={KEYS.F.toLocaleUpperCase()}
          data-testid="toolbar-frame"
          selected={frameToolSelected}
          disabled={isToolButtonDisabled(app, "frame")}
        >
          {t("toolBar.frame")}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onSelect={() => app.setActiveTool({ type: "embeddable" })}
          icon={EmbedIcon}
          data-testid="toolbar-embeddable"
          selected={embeddableToolSelected}
          disabled={isToolButtonDisabled(app, "embeddable")}
        >
          {t("toolBar.embeddable")}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onSelect={() => app.setActiveTool({ type: "autoshape" })}
          icon={drawShapeToolIcon}
          shortcut={getToolShortcut("autoshape")}
          data-testid="toolbar-autoshape"
          selected={drawShapeToolSelected}
          disabled={isToolButtonDisabled(app, "autoshape")}
        >
          {t("toolBar.autoshape")}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onSelect={() => app.setActiveTool({ type: "laser" })}
          icon={laserPointerToolIcon}
          data-testid="toolbar-laser"
          selected={laserToolSelected}
          shortcut={KEYS.K.toLocaleUpperCase()}
          disabled={isToolButtonDisabled(app, "laser")}
        >
          {t("toolBar.laser")}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onSelect={() => app.setActiveTool({ type: "bucketfill" })}
          icon={bucketFillIcon}
          data-testid="toolbar-bucketfill"
          selected={bucketFillToolSelected}
          shortcut={KEYS.B.toLocaleUpperCase()}
          disabled={isToolButtonDisabled(app, "bucketfill")}
        >
          {t("toolBar.bucketfill")}
        </DropdownMenu.Item>
        {isFullStylesPanel && (
          <DropdownMenu.Item
            onSelect={() => app.setActiveTool({ type: "lasso" })}
            icon={LassoIcon}
            data-testid="toolbar-lasso"
            selected={lassoToolSelected}
            disabled={isToolButtonDisabled(app, "lasso")}
          >
            {t("toolBar.lasso")}
          </DropdownMenu.Item>
        )}
        <div style={{ margin: "6px 0", fontSize: 14, fontWeight: 600 }}>
          Code
        </div>
        <DropdownMenu.Item
          onSelect={() =>
            setCodeBlockDraft({
              isOpen: true,
              elementId: null,
              title: "Example",
              language: "javascript",
              code: "console.log(\"Hello, world!\");",
            })
          }
          data-testid="toolbar-add-code-block"
        >
          Add code block
        </DropdownMenu.Item>
        <DropdownMenu.Item
          disabled={selectedCodeBlocks.length !== 1}
          onSelect={() => {
            const element = selectedCodeBlocks[0];
            if (!element || element.type !== "rectangle") return;
            const data = element.customData?.codeBlock || {};
            setCodeBlockDraft({
              isOpen: true,
              elementId: element.id,
              title: data.title || "Code",
              language: data.language || "javascript",
              code: data.code || "",
            });
          }}
          data-testid="toolbar-edit-code-block"
        >
          Edit selected code block
        </DropdownMenu.Item>
        <div style={{ margin: "6px 0", fontSize: 14, fontWeight: 600 }}>
          Generate
        </div>
        {app.props.aiEnabled !== false && <TTDDialogTriggerTunnel.Out />}
        <DropdownMenu.Item
          onSelect={() => app.setOpenDialog({ name: "ttd", tab: "mermaid" })}
          icon={mermaidLogoIcon}
          data-testid="toolbar-embeddable"
        >
          {t("toolBar.mermaidToExcalidraw")}
        </DropdownMenu.Item>
        {app.props.aiEnabled !== false && app.plugins.diagramToCode && (
          <DropdownMenu.Item
            onSelect={() => app.onMagicframeToolSelect()}
            icon={MagicIcon}
            data-testid="toolbar-magicframe"
            badge={<DropdownMenu.Item.Badge>AI</DropdownMenu.Item.Badge>}
            disabled={isToolButtonDisabled(app, "magicframe")}
          >
            {t("toolBar.magicframe")}
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
    {codeBlockDraft.isOpen && (
      <Dialog
        className="code-block-dialog"
        size="wide"
        title="Code block"
        onCloseRequest={() =>
          setCodeBlockDraft((draft) => ({ ...draft, isOpen: false }))
        }
        autofocus={false}
      >
        <div className="code-block-dialog__body">
          <div className="code-block-dialog__fields">
            <label className="code-block-dialog__field">
              <span>Title</span>
              <input
                type="text"
                value={codeBlockDraft.title}
                maxLength={80}
                onChange={(event) =>
                  setCodeBlockDraft((draft) => ({
                    ...draft,
                    title: event.target.value,
                  }))
                }
                placeholder="Code block title"
              />
            </label>
            <label className="code-block-dialog__field">
              <span>Language</span>
              <select
                value={codeBlockDraft.language}
                onChange={(event) =>
                  setCodeBlockDraft((draft) => ({
                    ...draft,
                    language: event.target.value,
                  }))
                }
              >
                {[
                  "javascript",
                  "typescript",
                  "python",
                  "c",
                  "cpp",
                  "java",
                  "html",
                  "css",
                  "json",
                  "sql",
                  "bash",
                ].map((language) => (
                  <option key={language} value={language}>
                    {language.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="code-block-dialog__editor">
            <CodeMirrorEditor
              value={codeBlockDraft.code}
              onChange={(code) =>
                setCodeBlockDraft((draft) => ({ ...draft, code }))
              }
              language={codeBlockDraft.language}
              theme={app.state.theme}
              placeholder="Write or paste your code here…"
            />
          </div>
          <div className="code-block-dialog__actions">
            <button
              type="button"
              className="excalidraw-button"
              onClick={() =>
                setCodeBlockDraft((draft) => ({ ...draft, isOpen: false }))
              }
            >
              Cancel
            </button>
            <button
              type="button"
              className="excalidraw-button"
              onClick={() => {
                const data = {
                  title: codeBlockDraft.title.trim() || "Code",
                  language: codeBlockDraft.language,
                  code: codeBlockDraft.code,
                };
                if (codeBlockDraft.elementId) {
                  const element = app.scene
                    .getNonDeletedElements()
                    .find((candidate) => candidate.id === codeBlockDraft.elementId);
                  if (element && element.type === "rectangle") {
                    app.mutateElement(element, {
                      customData: {
                        ...element.customData,
                        codeBlock: data,
                      },
                    });
                  }
                } else {
                  const zoom = app.state.zoom.value;
                  const element = newElement({
                    type: "rectangle",
                    x:
                      app.state.width / (2 * zoom) -
                      app.state.scrollX -
                      260,
                    y:
                      app.state.height / (2 * zoom) -
                      app.state.scrollY -
                      150,
                    width: 520,
                    height: 300,
                    strokeColor: "#64748b",
                    backgroundColor: "#111827",
                    fillStyle: "solid",
                    roughness: 0,
                    customData: { codeBlock: data },
                  });
                  app.updateScene({
                    elements: [
                      ...app.scene.getElementsIncludingDeleted(),
                      element,
                    ],
                    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
                  });
                  setAppState({
                    selectedElementIds: { [element.id]: true },
                  });
                }
                setCodeBlockDraft((draft) => ({ ...draft, isOpen: false }));
              }}
            >
              Save code block
            </button>
          </div>
        </div>
      </Dialog>
    )}
  );
};

/** the main (desktop/tablet) toolbar island */
export const Toolbar = ({
  app,
  appState,
  setAppState,
  UIOptions,
  onPenModeToggle,
  onLockToggle,
  heading,
}: {
  app: AppClassProperties;
  appState: UIAppState;
  setAppState: React.Component<any, AppState>["setState"];
  UIOptions: AppProps["UIOptions"];
  onPenModeToggle: AppClassProperties["togglePenMode"];
  onLockToggle: () => void;
  heading: React.ReactNode;
}) => {
  const editorInterface = useEditorInterface();
  const isCompactStylesPanel = useStylesPanelMode() === "compact";

  const activeTool = appState.activeTool;
  const toolProps = { app, activeTool };

  return (
    <Island
      padding={1}
      className={clsx("App-toolbar", {
        "zen-mode": appState.zenModeEnabled,
        "App-toolbar--compact": isCompactStylesPanel,
      })}
      data-viewport-ui="top"
    >
      <HintViewer
        appState={appState}
        isMobile={editorInterface.formFactor === "phone"}
        editorInterface={editorInterface}
        app={app}
      />
      {heading}
      <Stack.Row gap={isCompactStylesPanel ? 0.5 : 1}>
        {/* in compact UI the pen mode button is rendered as a separate
            floating button below the compact actions menu */}
        {!isCompactStylesPanel && (
          <PenModeButton
            checked={appState.penMode}
            onChange={() => onPenModeToggle(null)}
            title={t("toolBar.penMode")}
            penDetected={appState.penDetected}
          />
        )}
        {app.props.activeTool == null && (
          <>
            <LockButton
              checked={appState.activeTool.locked}
              onChange={onLockToggle}
              title={t("toolBar.lock")}
              // the active tool — including its lock state — is host-controlled
              disabled={app.props.activeTool != null}
            />

            <div
              className="App-toolbar__divider"
              style={{ marginRight: "0.25rem" }}
            />
          </>
        )}

        <HandToolButton {...toolProps} hideKeyBinding />
        {isCompactStylesPanel ? (
          <SelectionToolPopover {...toolProps} setAppState={setAppState} />
        ) : appState.preferredSelectionTool.type === "lasso" ? (
          <LassoToolButton {...toolProps} />
        ) : (
          <SelectionToolButton {...toolProps} />
        )}
        <RectangleToolButton {...toolProps} />
        <DiamondToolButton {...toolProps} />
        <EllipseToolButton {...toolProps} />
        <ArrowToolButton {...toolProps} />
        <LineToolButton {...toolProps} />
        {isCompactStylesPanel ? (
          <FreedrawToolPopover {...toolProps} />
        ) : (
          <FreedrawToolButton {...toolProps} />
        )}
        <TextToolButton {...toolProps} />
        {UIOptions.tools?.image !== false && <ImageToolButton {...toolProps} />}
        <EraserToolButton {...toolProps} />

        <div
          className="App-toolbar__divider"
          style={{ marginLeft: "0.25rem" }}
        />

        <ExtraToolsDropdown
          app={app}
          activeTool={activeTool}
          setAppState={setAppState}
        />
      </Stack.Row>
    </Island>
  );
};
